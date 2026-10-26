package com.hacademy.datahub.service;

import com.hacademy.datahub.publish.DirtyRegistry;
import com.hacademy.datahub.storage.AtomicJsonStorage;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class CrossPvpTop100Service {

    public static final String DATASET = "cross-pvp-top100";
    public static final String STORAGE_PATH = "cross-pvp/top100.json";

    private static final List<String> BRANCHES =
            List.of("army", "navy", "air");

    private static final Pattern ARMY_TEXT = Pattern.compile(
            "(?:육군|陸軍|陆军|\\barmy\\b|\\bland\\b)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern NAVY_TEXT = Pattern.compile(
            "(?:해군|海軍|海军|\\bnavy\\b|\\bnaval\\b)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern AIR_TEXT = Pattern.compile(
            "(?:공군|空軍|空军|\\bair(?:\\s*force)?\\b)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private final AtomicJsonStorage storage;
    private final DirtyRegistry dirtyRegistry;
    private final ObjectMapper objectMapper;

    public CrossPvpTop100Service(
            AtomicJsonStorage storage,
            DirtyRegistry dirtyRegistry,
            ObjectMapper objectMapper
    ) {
        this.storage = storage;
        this.dirtyRegistry = dirtyRegistry;
        this.objectMapper = objectMapper;
    }

    public synchronized int replace(JsonNode payload)
            throws IOException {

        validatePayload(payload);

        JsonNode previous = storage.readData(STORAGE_PATH).orElse(null);

        Map<String, JsonNode> resultsByUid = new LinkedHashMap<>();
        Map<String, JsonNode> mappedByUid = new LinkedHashMap<>();

        Instant previousTime = Instant.EPOCH;
        boolean migrationNeeded = false;

        if (previous != null
                && !previous.isMissingNode()
                && !previous.isNull()) {

            if (!previous.isObject()
                    || !previous.path("results").isArray()) {
                throw new IOException(
                        "Invalid stored Cross PVP dataset"
                );
            }

            previousTime = parseTime(
                    previous.path("collectedAt").asString(""),
                    Instant.EPOCH
            );

            Map<String, JsonNode> previousMapped =
                    indexByUid(previous.path("mappedResults"));

            for (JsonNode storedPlayer : previous.path("results")) {
                String uid = uid(storedPlayer);

                if (uid.isBlank()) {
                    throw new IOException(
                            "Stored Cross PVP player has no UID"
                    );
                }

                ObjectNode canonicalPlayer = canonicalizePlayer(
                        storedPlayer,
                        previousMapped.get(uid),
                        previousTime
                );
                ObjectNode canonicalMapped = canonicalizeMappedPlayer(
                        previousMapped.get(uid),
                        canonicalPlayer,
                        previousTime
                );

                migrationNeeded |= !canonicalPlayer.equals(storedPlayer);

                JsonNode storedMapped = previousMapped.get(uid);
                migrationNeeded |= storedMapped == null
                        || !canonicalMapped.equals(storedMapped);

                ObjectNode existing = asObject(resultsByUid.get(uid));
                ObjectNode existingMapped = asObject(mappedByUid.get(uid));

                resultsByUid.put(
                        uid,
                        mergePlayers(existing, canonicalPlayer, previousTime)
                );
                mappedByUid.put(
                        uid,
                        mergePlayers(
                                existingMapped,
                                canonicalMapped,
                                previousTime
                        )
                );
            }
        }

        Map<String, JsonNode> incomingMapped =
                indexByUid(payload.path("mappedResults"));

        Instant incomingTime = parseTime(
                payload.path("collectedAt").asString(""),
                Instant.EPOCH
        );

        int changed = 0;

        for (JsonNode incomingPlayerNode : payload.path("results")) {
            String uid = uid(incomingPlayerNode);

            ObjectNode incomingPlayer = canonicalizePlayer(
                    incomingPlayerNode,
                    incomingMapped.get(uid),
                    incomingTime
            );
            ObjectNode incomingMappedPlayer = canonicalizeMappedPlayer(
                    incomingMapped.get(uid),
                    incomingPlayer,
                    incomingTime
            );

            ObjectNode existing = asObject(resultsByUid.get(uid));
            ObjectNode oldMapped = asObject(mappedByUid.get(uid));

            ObjectNode mergedPlayer = mergePlayers(
                    existing,
                    incomingPlayer,
                    incomingTime
            );
            ObjectNode mergedMappedPlayer = mergePlayers(
                    oldMapped,
                    incomingMappedPlayer,
                    incomingTime
            );

            boolean modified = existing == null
                    || !existing.equals(mergedPlayer)
                    || oldMapped == null
                    || !oldMapped.equals(mergedMappedPlayer);

            resultsByUid.put(uid, mergedPlayer);
            mappedByUid.put(uid, mergedMappedPlayer);

            if (modified) {
                changed++;
            }
        }

        if (changed == 0 && !migrationNeeded) {
            return 0;
        }

        ArrayNode mergedResults = objectMapper.createArrayNode();
        ArrayNode mergedMapped = objectMapper.createArrayNode();

        for (Map.Entry<String, JsonNode> entry
                : resultsByUid.entrySet()) {

            mergedResults.add(entry.getValue());

            JsonNode mapped = mappedByUid.get(entry.getKey());
            if (mapped != null) {
                mergedMapped.add(mapped);
            }
        }

        ObjectNode merged = (ObjectNode) payload.deepCopy();

        merged.set("results", mergedResults);
        merged.set("mappedResults", mergedMapped);
        merged.put("totalPlayers", mergedResults.size());

        Instant latestTime = incomingTime.isAfter(previousTime)
                ? incomingTime
                : previousTime;

        merged.put("collectedAt", latestTime.toString());
        merged.put("receivedAt", Instant.now().toString());

        storage.writeData(STORAGE_PATH, merged);
        dirtyRegistry.mark(DATASET);

        return changed;
    }

    private ObjectNode canonicalizePlayer(
            JsonNode player,
            JsonNode mappedHint,
            Instant fallbackTime
    ) {
        if (player == null || !player.isObject()) {
            throw new IllegalArgumentException(
                    "Cross PVP player must be an object"
            );
        }

        ObjectNode canonical = (ObjectNode) player.deepCopy();
        ObjectNode branches = emptyBranches();
        JsonNode suppliedBranches = player.path("branches");

        if (suppliedBranches.isObject()) {
            for (String branch : BRANCHES) {
                JsonNode supplied = suppliedBranches.get(branch);

                if (!hasCollectedData(supplied)) {
                    branches.putNull(branch);
                    continue;
                }

                branches.set(
                        branch,
                        canonicalizeBranchRecord(
                                supplied,
                                null,
                                fallbackTime
                        )
                );
            }
        } else {
            JsonNode formations = player.path("formations");

            if (formations.isArray() && !formations.isEmpty()) {
                String branch = detectLegacyBranch(player, mappedHint);

                if (branch == null) {
                    throw new IllegalArgumentException(
                            "Unable to determine troop branch for UID "
                                    + uid(player)
                    );
                }

                branches.set(
                        branch,
                        canonicalizeBranchRecord(
                                legacyBranchRecord(player),
                                null,
                                fallbackTime
                        )
                );
            }
        }

        canonical.set("branches", branches);
        removeLegacySnapshotFields(canonical);
        canonical.put(
                "collectedAt",
                latestBranchTime(branches, playerTime(player, fallbackTime))
                        .toString()
        );

        return canonical;
    }

    private ObjectNode canonicalizeMappedPlayer(
            JsonNode mapped,
            ObjectNode rawCanonical,
            Instant fallbackTime
    ) {
        ObjectNode canonical;

        if (mapped != null && mapped.isObject()) {
            canonical = canonicalizePlayer(
                    mapped,
                    mapped,
                    fallbackTime
            );
        } else {
            canonical = (ObjectNode) rawCanonical.deepCopy();
        }

        copyMissing(canonical, rawCanonical, "rank");
        copyMissing(canonical, rawCanonical, "uid");
        copyMissing(canonical, rawCanonical, "username");
        copyMissing(canonical, rawCanonical, "serverId");
        copyMissing(canonical, rawCanonical, "level");
        copyMissing(canonical, rawCanonical, "rankingPower");
        copyMissing(canonical, rawCanonical, "TP");

        ObjectNode mappedBranches = asObject(canonical.path("branches"));
        ObjectNode rawBranches = asObject(rawCanonical.path("branches"));

        for (String branch : BRANCHES) {
            JsonNode rawRecord = rawBranches == null
                    ? null
                    : rawBranches.get(branch);
            JsonNode mappedRecord = mappedBranches == null
                    ? null
                    : mappedBranches.get(branch);

            if (!hasCollectedData(rawRecord)) {
                continue;
            }

            if (!hasCollectedData(mappedRecord)) {
                mappedBranches.set(branch, rawRecord.deepCopy());
                continue;
            }

            ObjectNode enriched = (ObjectNode) mappedRecord.deepCopy();
            copyField(enriched, rawRecord, "power");
            copyField(enriched, rawRecord, "totalArmy");
            copyField(enriched, rawRecord, "collectedAt");
            mappedBranches.set(branch, enriched);
        }

        canonical.set("branches", mappedBranches);
        canonical.put(
                "collectedAt",
                latestBranchTime(
                        mappedBranches,
                        playerTime(rawCanonical, fallbackTime)
                ).toString()
        );

        return canonical;
    }

    private ObjectNode canonicalizeBranchRecord(
            JsonNode record,
            JsonNode metadata,
            Instant fallbackTime
    ) {
        ObjectNode canonical = record != null && record.isObject()
                ? (ObjectNode) record.deepCopy()
                : objectMapper.createObjectNode();

        JsonNode formations = canonical.path("formations");
        if (!formations.isArray()) {
            canonical.set("formations", objectMapper.createArrayNode());
            formations = canonical.path("formations");
        }

        long power = positiveOrZero(
                canonical.path("power"),
                positiveOrZero(
                        metadata == null ? null : metadata.path("power"),
                        maximumFormationValue(formations, "power")
                )
        );
        long totalArmy = positiveOrZero(
                canonical.path("totalArmy"),
                positiveOrZero(
                        metadata == null
                                ? null
                                : metadata.path("totalArmy"),
                        maximumFormationValue(formations, "totalArmy")
                )
        );

        if (power >= 0) {
            canonical.put("power", power);
        } else {
            canonical.putNull("power");
        }

        if (totalArmy >= 0) {
            canonical.put("totalArmy", totalArmy);
        } else {
            canonical.putNull("totalArmy");
        }

        Instant collectedAt = firstTime(
                canonical.path("collectedAt").asString(""),
                metadata == null
                        ? ""
                        : metadata.path("collectedAt").asString(""),
                fallbackTime
        );

        canonical.put("collectedAt", collectedAt.toString());

        return canonical;
    }

    private ObjectNode legacyBranchRecord(JsonNode player) {
        ObjectNode record = objectMapper.createObjectNode();
        record.set("formations", player.path("formations").deepCopy());

        if (player.has("totalArmy")) {
            record.set("totalArmy", player.get("totalArmy").deepCopy());
        }

        if (player.has("power")) {
            record.set("power", player.get("power").deepCopy());
        }

        if (player.has("collectedAt")) {
            record.set(
                    "collectedAt",
                    player.get("collectedAt").deepCopy()
            );
        }

        return record;
    }

    private ObjectNode mergePlayers(
            ObjectNode existing,
            ObjectNode incoming,
            Instant fallbackTime
    ) {
        if (existing == null) {
            return (ObjectNode) incoming.deepCopy();
        }

        Instant existingTime = playerTime(existing, fallbackTime);
        Instant incomingTime = playerTime(incoming, fallbackTime);

        ObjectNode merged = incomingTime.isBefore(existingTime)
                ? (ObjectNode) existing.deepCopy()
                : (ObjectNode) incoming.deepCopy();

        ObjectNode oldBranches = asObject(existing.path("branches"));
        ObjectNode newBranches = asObject(incoming.path("branches"));
        ObjectNode mergedBranches = emptyBranches();

        for (String branch : BRANCHES) {
            JsonNode oldRecord = oldBranches == null
                    ? null
                    : oldBranches.get(branch);
            JsonNode newRecord = newBranches == null
                    ? null
                    : newBranches.get(branch);

            JsonNode selected = selectLatestBranch(
                    oldRecord,
                    newRecord,
                    fallbackTime
            );

            if (hasCollectedData(selected)) {
                mergedBranches.set(branch, selected.deepCopy());
            } else {
                mergedBranches.putNull(branch);
            }
        }

        merged.set("branches", mergedBranches);
        removeLegacySnapshotFields(merged);
        merged.put(
                "collectedAt",
                latestBranchTime(
                        mergedBranches,
                        existingTime.isAfter(incomingTime)
                                ? existingTime
                                : incomingTime
                ).toString()
        );

        return merged;
    }

    private JsonNode selectLatestBranch(
            JsonNode existing,
            JsonNode incoming,
            Instant fallbackTime
    ) {
        if (!hasCollectedData(incoming)) {
            return existing;
        }
        if (!hasCollectedData(existing)) {
            return incoming;
        }

        Instant existingTime = branchTime(existing, fallbackTime);
        Instant incomingTime = branchTime(incoming, fallbackTime);

        return incomingTime.isBefore(existingTime)
                ? existing
                : incoming;
    }

    private String detectLegacyBranch(
            JsonNode player,
            JsonNode mappedHint
    ) {
        Set<String> candidates = new HashSet<>();

        addExplicitBranch(player, candidates);
        addExplicitBranch(mappedHint, candidates);
        collectBranchCandidates(player.path("formations"), candidates);

        if (mappedHint != null) {
            collectBranchCandidates(
                    mappedHint.path("formations"),
                    candidates
            );
        }

        if (candidates.size() != 1) {
            return null;
        }

        return candidates.iterator().next();
    }

    private void addExplicitBranch(
            JsonNode node,
            Set<String> candidates
    ) {
        if (node == null || !node.isObject()) {
            return;
        }

        for (String field : List.of(
                "branch",
                "troopType",
                "armyType",
                "unitType"
        )) {
            String branch = normalizeBranch(
                    node.path(field).asString("")
            );
            if (branch != null) {
                candidates.add(branch);
            }
        }
    }

    private void collectBranchCandidates(
            JsonNode node,
            Set<String> candidates
    ) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }

        if (node.isObject()) {
            addExplicitBranch(node, candidates);

            String branchById = branchByArmyId(
                    node.path("armyId").asString("")
            );
            if (branchById != null) {
                candidates.add(branchById);
            }

            for (JsonNode child : node) {
                collectBranchCandidates(child, candidates);
            }
            return;
        }

        if (node.isArray()) {
            for (JsonNode child : node) {
                collectBranchCandidates(child, candidates);
            }
            return;
        }

        if (node.isTextual()) {
            String branch = branchByText(node.asString(""));
            if (branch != null) {
                candidates.add(branch);
            }
        }
    }

    private String normalizeBranch(String value) {
        String normalized = value == null
                ? ""
                : value.trim().toLowerCase(Locale.ROOT);

        return switch (normalized) {
            case "army", "land", "육군", "陸軍", "陆军" -> "army";
            case "navy", "naval", "해군", "海軍", "海军" -> "navy";
            case "air", "air force", "airforce", "공군", "空軍", "空军" -> "air";
            default -> null;
        };
    }

    private String branchByText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        if (ARMY_TEXT.matcher(value).find()) {
            return "army";
        }
        if (NAVY_TEXT.matcher(value).find()) {
            return "navy";
        }
        if (AIR_TEXT.matcher(value).find()) {
            return "air";
        }
        return null;
    }

    private String branchByArmyId(String value) {
        String id = value == null ? "" : value.trim();

        if (id.matches("^1\\d{4,}$")
                || id.matches("^90[12]\\d{3}$")) {
            return "army";
        }
        if (id.matches("^2\\d{4,}$")
                || id.matches("^90[34]\\d{3}$")) {
            return "navy";
        }
        if (id.matches("^3\\d{4,}$")
                || id.matches("^90[56]\\d{3}$")) {
            return "air";
        }

        return null;
    }

    private void validatePayload(JsonNode payload) {
        if (payload == null || !payload.isObject()) {
            throw new IllegalArgumentException(
                    "Cross PVP payload must be an object"
            );
        }

        JsonNode results = payload.path("results");

        if (!results.isArray() || results.size() != 100) {
            throw new IllegalArgumentException(
                    "Cross PVP results must contain exactly 100 players"
            );
        }

        if (payload.path("completed").asInt(-1) != 100) {
            throw new IllegalArgumentException(
                    "Cross PVP completed must be 100"
            );
        }

        if (payload.path("stopped").asBoolean(false)) {
            throw new IllegalArgumentException(
                    "Stopped Cross PVP survey cannot be published"
            );
        }

        Set<String> uids = new HashSet<>();
        Set<Integer> ranks = new HashSet<>();

        for (JsonNode player : results) {
            String uid = uid(player);
            int rank = player.path("rank").asInt(0);

            if (uid.isBlank()) {
                throw new IllegalArgumentException(
                        "Cross PVP player uid is required"
                );
            }

            if (rank < 1 || rank > 100) {
                throw new IllegalArgumentException(
                        "Invalid Cross PVP rank: " + rank
                );
            }

            if (!uids.add(uid)) {
                throw new IllegalArgumentException(
                        "Duplicate Cross PVP uid: " + uid
                );
            }

            if (!ranks.add(rank)) {
                throw new IllegalArgumentException(
                        "Duplicate Cross PVP rank: " + rank
                );
            }

            validateBranches(player.path("branches"), uid);
        }

        for (int rank = 1; rank <= 100; rank++) {
            if (!ranks.contains(rank)) {
                throw new IllegalArgumentException(
                        "Missing Cross PVP rank: " + rank
                );
            }
        }

        JsonNode mapped = payload.path("mappedResults");

        if (!mapped.isMissingNode()) {
            if (!mapped.isArray() || mapped.size() != 100) {
                throw new IllegalArgumentException(
                        "Cross PVP mappedResults must contain 100 players"
                );
            }

            Set<String> mappedUids = new HashSet<>();

            for (JsonNode player : mapped) {
                String uid = uid(player);

                if (uid.isBlank() || !mappedUids.add(uid)) {
                    throw new IllegalArgumentException(
                            "Invalid or duplicate mapped UID: " + uid
                    );
                }

                validateBranches(player.path("branches"), uid);
            }

            if (!mappedUids.equals(uids)) {
                throw new IllegalArgumentException(
                        "Cross PVP results/mappedResults UID mismatch"
                );
            }
        }
    }

    private void validateBranches(JsonNode branches, String uid) {
        if (branches.isMissingNode() || branches.isNull()) {
            return;
        }
        if (!branches.isObject()) {
            throw new IllegalArgumentException(
                    "Cross PVP branches must be an object for UID " + uid
            );
        }

        for (String branch : BRANCHES) {
            JsonNode record = branches.get(branch);

            if (record == null || record.isNull()) {
                continue;
            }
            if (!record.isObject()) {
                throw new IllegalArgumentException(
                        "Invalid " + branch + " branch for UID " + uid
                );
            }

            String collectedAt = record.path("collectedAt").asString("");
            if (!collectedAt.isBlank()) {
                parseTime(collectedAt, Instant.EPOCH);
            }

            if (record.has("power")
                    && !record.path("power").isNull()
                    && record.path("power").asLong(-1) < 0) {
                throw new IllegalArgumentException(
                        "Invalid branch power for UID " + uid
                );
            }

            if (record.has("formations")
                    && !record.path("formations").isArray()) {
                throw new IllegalArgumentException(
                        "Branch formations must be an array for UID " + uid
                );
            }
        }
    }

    private Map<String, JsonNode> indexByUid(JsonNode array) {
        Map<String, JsonNode> indexed = new LinkedHashMap<>();

        if (!array.isArray()) {
            return indexed;
        }

        for (JsonNode item : array) {
            String uid = uid(item);
            if (!uid.isBlank()) {
                indexed.put(uid, item);
            }
        }

        return indexed;
    }

    private ObjectNode emptyBranches() {
        ObjectNode branches = objectMapper.createObjectNode();
        for (String branch : BRANCHES) {
            branches.putNull(branch);
        }
        return branches;
    }

    private boolean hasCollectedData(JsonNode record) {
        if (record == null || !record.isObject()) {
            return false;
        }

        return record.path("formations").isArray()
                && !record.path("formations").isEmpty()
                || record.has("power") && !record.path("power").isNull()
                || record.has("totalArmy")
                && !record.path("totalArmy").isNull();
    }

    private long positiveOrZero(JsonNode node, long fallback) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return fallback;
        }
        long value = node.asLong(-1);
        return value >= 0 ? value : fallback;
    }

    private long maximumFormationValue(
            JsonNode formations,
            String field
    ) {
        long maximum = -1;

        if (!formations.isArray()) {
            return maximum;
        }

        for (JsonNode formation : formations) {
            long value = formation.path(field).asLong(-1);
            if (value > maximum) {
                maximum = value;
            }
        }

        return maximum;
    }

    private Instant latestBranchTime(
            JsonNode branches,
            Instant fallback
    ) {
        Instant latest = fallback;

        if (branches != null && branches.isObject()) {
            for (String branch : BRANCHES) {
                JsonNode record = branches.get(branch);
                if (!hasCollectedData(record)) {
                    continue;
                }

                Instant time = branchTime(record, fallback);
                if (time.isAfter(latest)) {
                    latest = time;
                }
            }
        }

        return latest;
    }

    private Instant branchTime(
            JsonNode branch,
            Instant fallback
    ) {
        return parseTime(
                branch.path("collectedAt").asString(""),
                fallback
        );
    }

    private Instant playerTime(
            JsonNode player,
            Instant fallback
    ) {
        return parseTime(
                player.path("collectedAt").asString(""),
                fallback
        );
    }

    private Instant firstTime(
            String primary,
            String secondary,
            Instant fallback
    ) {
        if (primary != null && !primary.isBlank()) {
            return parseTime(primary, fallback);
        }
        if (secondary != null && !secondary.isBlank()) {
            return parseTime(secondary, fallback);
        }
        return fallback;
    }

    private Instant parseTime(
            String value,
            Instant fallback
    ) {
        if (value == null || value.isBlank()) {
            return fallback;
        }

        try {
            return Instant.parse(value);
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException(
                    "Invalid ISO-8601 timestamp: " + value,
                    exception
            );
        }
    }

    private void copyMissing(
            ObjectNode target,
            JsonNode source,
            String field
    ) {
        if ((!target.has(field) || target.path(field).isNull())
                && source != null
                && source.has(field)) {
            target.set(field, source.get(field).deepCopy());
        }
    }

    private void copyField(
            ObjectNode target,
            JsonNode source,
            String field
    ) {
        if (source != null && source.has(field)) {
            target.set(field, source.get(field).deepCopy());
        }
    }

    private void removeLegacySnapshotFields(ObjectNode player) {
        player.remove("formations");
        player.remove("totalArmy");
        player.remove("branch");
        player.remove("troopType");
        player.remove("armyType");
        player.remove("unitType");
    }

    private ObjectNode asObject(JsonNode node) {
        return node != null && node.isObject()
                ? (ObjectNode) node
                : null;
    }

    private String uid(JsonNode player) {
        return player == null
                ? ""
                : player.path("uid").asString("").trim();
    }
}
