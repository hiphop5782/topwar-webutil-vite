import "./TitanRefineSimulator.css";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslation } from "react-i18next";
import { FaCheck } from "react-icons/fa";
import { FaXmark } from "react-icons/fa6";

import colorList from "@src/assets/json/titan/titan-colors.json";
import partsList from "@src/assets/json/titan/titan-parts-types.json";
import gearNames from "@src/assets/json/titan/titan-gear-names.json";
import gearOptionList from "@src/assets/json/titan/titan-gear-options.json";
import gearOptionRange from "@src/assets/json/titan/titan-gear-range.json";
import { Helmet } from "react-helmet-async";
import SEO from "../../template/SEO";

const MAX_OPTION_COUNT = 3;
const HISTORY_LIMIT = 50;
const ANIMATION_STEP_MS = 160;
const MIN_ANIMATION_STEPS = 8;
const MATERIAL_ANIMATION_STEPS = 7;
const OPTION_COUNT_VALUES = [1, 2, 3];
const OPTION_COUNT_WEIGHTS = [0.4, 0.4, 0.2];

const OPTION_TITLE_KEYS = {
    "육군 공격력 증가": "armyAttack",
    "해군 공격력 증가": "navyAttack",
    "공군 공격력 증가": "airAttack",

    "육군 데미지 증가": "armyDamageIncrease",
    "해군 데미지 증가": "navyDamageIncrease",
    "공군 데미지 증가": "airDamageIncrease",

    "육군 생명력 증가": "armyHp",
    "해군 생명력 증가": "navyHp",
    "공군 생명력 증가": "airHp",

    "육군 방어도 증가": "armyDefense",
    "해군 방어도 증가": "navyDefense",
    "공군 방어도 증가": "airDefense",

    "육군 데미지 감면": "armyDamageReduction",
    "해군 데미지 감면": "navyDamageReduction",
    "공군 데미지 감면": "airDamageReduction",
};

const RANGE_TYPE_KEYS = {
    데미지: "damage",
    공격력: "attack",
    생명력: "hp",
    방어도: "defense",
};

const roundToTwo = (value) =>
    Number(Number(value).toFixed(2));

const clamp = (value, min, max) =>
    Math.min(Math.max(value, min), max);

const getRandomUnit = () => {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.getRandomValues === "function"
    ) {
        const buffer = new Uint32Array(1);
        crypto.getRandomValues(buffer);

        return buffer[0] / 0x100000000;
    }

    return Math.random();
};

const getRandomInRange = (min, max) =>
    min + getRandomUnit() * (max - min);

const getRandomItem = (items) => {
    if (items.length === 0) {
        return null;
    }

    const index = Math.floor(
        getRandomUnit() * items.length
    );

    return items[index];
};

const getWeightedRandomValue = (values, weights) => {
    const totalWeight = weights.reduce(
        (total, weight) => total + weight,
        0
    );

    if (totalWeight <= 0) {
        return values[0] ?? null;
    }

    const target = getRandomUnit() * totalWeight;
    let accumulated = 0;

    for (let index = 0; index < values.length; index++) {
        accumulated += weights[index] ?? 0;

        if (target < accumulated) {
            return values[index];
        }
    }

    return values.at(-1) ?? null;
};

const getGaussianRandomValue = (
    min,
    max,
    mean = (min + max) / 2,
    standardDeviation = (max - min) / 6
) => {
    if (min === max) {
        return roundToTwo(min);
    }

    for (let attempt = 0; attempt < 1000; attempt++) {
        let u = 0;
        let v = 0;

        while (u === 0) {
            u = getRandomUnit();
        }

        while (v === 0) {
            v = getRandomUnit();
        }

        const standardNormal =
            Math.sqrt(-2 * Math.log(u)) *
            Math.cos(2 * Math.PI * v);
        const value =
            standardNormal * standardDeviation + mean;

        if (value >= min && value <= max) {
            return roundToTwo(value);
        }
    }

    return roundToTwo(clamp(mean, min, max));
};

const getOptionConfig = (part, title) =>
    gearOptionList[part]?.find(
        (option) => option.title === title
    ) ?? null;

const getDefaultOptionConfig = (part) => {
    const options = gearOptionList[part] ?? [];

    return options[3] ?? options[0] ?? null;
};

const getOptionMidpoint = (option) => {
    if (!option) {
        return 0;
    }

    return roundToTwo(
        (Number(option.min) + Number(option.max)) /
            2
    );
};

const normalizeOption = (part, option) => {
    const config =
        getOptionConfig(part, option?.title) ??
        getDefaultOptionConfig(part);

    if (!config) {
        return {
            title: "",
            value: 0,
            max: false,
        };
    }

    const parsedValue = Number(option?.value);
    const safeValue = Number.isFinite(parsedValue)
        ? parsedValue
        : getOptionMidpoint(config);

    const value = roundToTwo(
        clamp(safeValue, 0, Number(config.max))
    );

    return {
        title: config.title,
        value,
        max: value >= Number(config.max),
    };
};

const createDefaultOption = (part) => {
    const config = getDefaultOptionConfig(part);

    return normalizeOption(part, {
        title: config?.title,
        value: getOptionMidpoint(config),
    });
};

const createRandomTitanOptions = (
    part,
    guaranteedTitle = ""
) => {
    const availableOptions = gearOptionList[part] ?? [];

    if (availableOptions.length === 0) {
        return [];
    }

    const optionCount = getWeightedRandomValue(
        OPTION_COUNT_VALUES,
        OPTION_COUNT_WEIGHTS
    );
    const guaranteedOption = availableOptions.find(
        (option) => option.title === guaranteedTitle
    );
    const selectedConfigs = guaranteedOption
        ? [guaranteedOption]
        : [];

    while (selectedConfigs.length < optionCount) {
        selectedConfigs.push(
            getRandomItem(availableOptions)
        );
    }

    return selectedConfigs.map((option) =>
        normalizeOption(part, {
            title: option.title,
            value: getGaussianRandomValue(
                Number(option.min),
                Number(option.max)
            ),
        })
    );
};

const createDraft = (option) => ({
    title: option?.title ?? "",
    value:
        option?.value === null ||
        option?.value === undefined
            ? ""
            : String(option.value),
});

const getRefineRange = (title) =>
    gearOptionRange.find((range) =>
        title.includes(range.type)
    ) ?? null;

const getEligibleIndices = (
    currentOptions,
    materialOption
) => {
    const indices = currentOptions
        .map((option, index) => {
            const isSameOptionAtMax =
                option.title === materialOption.title &&
                option.max === true;

            return isSameOptionAtMax ? -1 : index;
        })
        .filter((index) => index >= 0);

    if (
        currentOptions.length <
        MAX_OPTION_COUNT
    ) {
        indices.push(currentOptions.length);
    }

    return indices;
};

const buildRefineResult = ({
    part,
    currentOptions,
    materialOption,
}) => {
    const incomingOption = normalizeOption(
        part,
        materialOption
    );

    const eligibleIndices = getEligibleIndices(
        currentOptions,
        incomingOption
    );

    const targetIndex =
        getRandomItem(eligibleIndices);

    if (targetIndex === null) {
        return null;
    }

    const nextOptions = currentOptions.map(
        (option) => ({ ...option })
    );
    const previousOption =
        nextOptions[targetIndex] ?? null;

    if (!previousOption) {
        nextOptions[targetIndex] = {
            ...incomingOption,
        };

        return {
            options: nextOptions,
            history: {
                action: "added",
                slotIndex: targetIndex,
                before: null,
                after: {
                    ...incomingOption,
                },
                increase: 0,
                capped: incomingOption.max,
                material: { ...incomingOption },
            },
        };
    }

    if (
        previousOption.title !==
        incomingOption.title
    ) {
        nextOptions[targetIndex] = {
            ...incomingOption,
        };

        return {
            options: nextOptions,
            history: {
                action: "replaced",
                slotIndex: targetIndex,
                before: {
                    ...previousOption,
                },
                after: {
                    ...incomingOption,
                },
                increase: 0,
                capped: incomingOption.max,
                material: { ...incomingOption },
            },
        };
    }

    const range = getRefineRange(
        previousOption.title
    );
    const optionConfig = getOptionConfig(
        part,
        previousOption.title
    );

    if (!range || !optionConfig) {
        return null;
    }

    const increment = getRandomInRange(
        Number(range.min),
        Number(range.max)
    );
    const rawValue =
        Number(previousOption.value) + increment;
    const maxValue = Number(optionConfig.max);
    const nextValue = roundToTwo(
        Math.min(rawValue, maxValue)
    );
    const actualIncrease = roundToTwo(
        nextValue - Number(previousOption.value)
    );

    const upgradedOption = {
        ...previousOption,
        value: nextValue,
        max: nextValue >= maxValue,
    };

    nextOptions[targetIndex] = upgradedOption;

    return {
        options: nextOptions,
        history: {
            action: "upgraded",
            slotIndex: targetIndex,
            before: {
                ...previousOption,
            },
            after: {
                ...upgradedOption,
            },
            increase: actualIncrease,
            capped: upgradedOption.max,
            material: { ...incomingOption },
        },
    };
};

export default function TitanRefineSimulator() {
    const { t, i18n } =
        useTranslation("viewer");

    const initialPart =
        partsList.includes("pistol")
            ? "pistol"
            : partsList[0];

    const [parts, setParts] =
        useState(initialPart);
    const [gearOptions, setGearOptions] =
        useState(() => [
            createDefaultOption(initialPart),
        ]);
    const [gearGuaranteedOptionTitle, setGearGuaranteedOptionTitle] =
        useState("");
    const [materialOptions, setMaterialOptions] =
        useState(() => [
            createDefaultOption(initialPart),
        ]);
    const [
        materialGuaranteedOptionTitle,
        setMaterialGuaranteedOptionTitle,
    ] =
        useState("");
    const [useStabilizer, setUseStabilizer] =
        useState(false);
    const [stabilizedMaterialIndex, setStabilizedMaterialIndex] =
        useState(0);

    const [
        editingGearIndex,
        setEditingGearIndex,
    ] = useState(null);
    const [gearDraft, setGearDraft] =
        useState(() =>
            createDraft(
                createDefaultOption(initialPart)
            )
        );
    const [
        editingMaterialIndex,
        setEditingMaterialIndex,
    ] = useState(null);
    const [
        materialDraft,
        setMaterialDraft,
    ] = useState(() =>
        createDraft(
            createDefaultOption(initialPart)
        )
    );

    const [history, setHistory] =
        useState([]);
    const [useAnimation, setUseAnimation] =
        useState(true);
    const [
        animationPlaying,
        setAnimationPlaying,
    ] = useState(false);
    const [
        animationIndex,
        setAnimationIndex,
    ] = useState(-1);
    const [
        selectedIndex,
        setSelectedIndex,
    ] = useState(-1);
    const [
        materialAnimationIndex,
        setMaterialAnimationIndex,
    ] = useState(-1);
    const [
        selectedMaterialIndex,
        setSelectedMaterialIndex,
    ] = useState(-1);

    const animationTimerRef = useRef(null);
    const historySequenceRef = useRef(0);

    const locale = useMemo(() => {
        const language =
            i18n.resolvedLanguage ??
            i18n.language ??
            "ko";

        if (language.startsWith("ja")) {
            return "ja-JP";
        }

        if (language.startsWith("en")) {
            return "en-US";
        }

        return "ko-KR";
    }, [
        i18n.resolvedLanguage,
        i18n.language,
    ]);

    const numberFormatter = useMemo(
        () =>
            new Intl.NumberFormat(locale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }),
        [locale]
    );

    const timeFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(locale, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            }),
        [locale]
    );

    const clearAnimationTimer =
        useCallback(() => {
            if (animationTimerRef.current) {
                window.clearTimeout(
                    animationTimerRef.current
                );
                animationTimerRef.current =
                    null;
            }
        }, []);

    useEffect(() => {
        return () => {
            clearAnimationTimer();
        };
    }, [clearAnimationTimer]);

    useEffect(() => {
        if (
            materialOptions.length <= 1 &&
            useStabilizer
        ) {
            setUseStabilizer(false);
        }
    }, [materialOptions.length, useStabilizer]);

    const formatNumber = useCallback(
        (value) =>
            numberFormatter.format(
                Number(value) || 0
            ),
        [numberFormatter]
    );

    const formatPercent = useCallback(
        (value) =>
            t(
                "TitanRefineSimulator.format.percent",
                {
                    value: formatNumber(value),
                }
            ),
        [formatNumber, t]
    );

    const getPartName = useCallback(
        (part) =>
            t(
                `TitanRefineSimulator.parts.${part}`,
                {
                    defaultValue:
                        gearNames[part] ?? part,
                }
            ),
        [t]
    );

    const getOptionName = useCallback(
        (title) => {
            const key =
                OPTION_TITLE_KEYS[title];

            if (!key) {
                return title;
            }

            return t(
                `TitanRefineSimulator.options.${key}`,
                {
                    defaultValue: title,
                }
            );
        },
        [t]
    );

    const getRangeTypeName =
        useCallback(
            (type) => {
                const key =
                    RANGE_TYPE_KEYS[type];

                if (!key) {
                    return type;
                }

                return t(
                    `TitanRefineSimulator.rangeTypes.${key}`,
                    {
                        defaultValue: type,
                    }
                );
            },
            [t]
        );

    const publicUrl = useMemo(
        () =>
            (
                import.meta.env
                    .VITE_PUBLIC_URL ?? ""
            ).replace(/\/$/, ""),
        []
    );

    const getPartImageUrl = useCallback(
        (part) =>
            `${publicUrl}/images/titan/titan-item-${part}.png`,
        [publicUrl]
    );

    const getGearImageUrl = useCallback(
        (part) =>
            `${publicUrl}/images/titan/${part}-gold.png`,
        [publicUrl]
    );

    const stabilizerImageUrl =
        `${publicUrl}/images/titan/titan-stabilizer.png`;

    const isEditing =
        editingGearIndex !== null ||
        editingMaterialIndex !== null;

    const eligibleMaterialIndices = useMemo(
        () =>
            materialOptions
                .map((option, index) =>
                    getEligibleIndices(
                        gearOptions,
                        option
                    ).length > 0
                        ? index
                        : -1
                )
                .filter((index) => index >= 0),
        [gearOptions, materialOptions]
    );

    const activeMaterialIndices = useMemo(() => {
        if (!useStabilizer) {
            return eligibleMaterialIndices;
        }

        return eligibleMaterialIndices.includes(
            stabilizedMaterialIndex
        )
            ? [stabilizedMaterialIndex]
            : [];
    }, [
        eligibleMaterialIndices,
        stabilizedMaterialIndex,
        useStabilizer,
    ]);

    const canRefine =
        !isEditing &&
        !animationPlaying &&
        activeMaterialIndices.length > 0;

    const statistics = useMemo(() => {
        const result = {
            total: history.length,
            added: 0,
            upgraded: 0,
            replaced: 0,
            capped: 0,
        };

        for (const entry of history) {
            result[entry.action] += 1;

            if (entry.capped) {
                result.capped += 1;
            }
        }

        return result;
    }, [history]);

    const cancelAllEditing =
        useCallback(() => {
            setEditingGearIndex(null);
            setEditingMaterialIndex(null);
        }, []);

    const resetSimulator = useCallback(
        (part = parts) => {
            clearAnimationTimer();

            const defaultOption =
                createDefaultOption(part);

            setGearOptions([
                defaultOption,
            ]);
            setGearGuaranteedOptionTitle("");
            setMaterialOptions([
                { ...defaultOption },
            ]);
            setMaterialGuaranteedOptionTitle("");
            setUseStabilizer(false);
            setStabilizedMaterialIndex(0);
            setGearDraft(
                createDraft(defaultOption)
            );
            setMaterialDraft(
                createDraft(defaultOption)
            );
            setHistory([]);
            setAnimationPlaying(false);
            setAnimationIndex(-1);
            setSelectedIndex(-1);
            setMaterialAnimationIndex(-1);
            setSelectedMaterialIndex(-1);
            cancelAllEditing();
        },
        [
            cancelAllEditing,
            clearAnimationTimer,
            parts,
        ]
    );

    const changePart = useCallback(
        (part) => {
            if (
                animationPlaying ||
                part === parts
            ) {
                return;
            }

            setParts(part);
            resetSimulator(part);
        },
        [
            animationPlaying,
            parts,
            resetSimulator,
        ]
    );

    const addGearOption = useCallback(() => {
        if (
            animationPlaying ||
            isEditing ||
            gearOptions.length >=
                MAX_OPTION_COUNT
        ) {
            return;
        }

        setGearOptions((previous) => [
            ...previous,
            createDefaultOption(parts),
        ]);
        setSelectedIndex(-1);
    }, [
        animationPlaying,
        gearOptions.length,
        isEditing,
        parts,
    ]);

    const removeGearOption =
        useCallback(() => {
            if (
                animationPlaying ||
                isEditing ||
                gearOptions.length <= 1
            ) {
                return;
            }

            setGearOptions((previous) =>
                previous.slice(0, -1)
            );
            setSelectedIndex(-1);
        }, [
            animationPlaying,
            gearOptions.length,
            isEditing,
        ]);

    const randomizeGearOptions = useCallback(() => {
        if (animationPlaying || isEditing) {
            return;
        }

        const nextOptions = createRandomTitanOptions(
            parts,
            gearGuaranteedOptionTitle
        );

        if (nextOptions.length === 0) {
            return;
        }

        setGearOptions(nextOptions);
        setSelectedIndex(-1);
    }, [
        animationPlaying,
        gearGuaranteedOptionTitle,
        isEditing,
        parts,
    ]);

    const beginGearEdit = useCallback(
        (index) => {
            if (animationPlaying) {
                return;
            }

            const option =
                gearOptions[index];

            if (!option) {
                return;
            }

            setEditingMaterialIndex(null);
            setEditingGearIndex(index);
            setGearDraft(
                createDraft(option)
            );
        },
        [animationPlaying, gearOptions]
    );

    const changeGearDraftTitle =
        useCallback(
            (event) => {
                const title =
                    event.target.value;
                const config =
                    getOptionConfig(
                        parts,
                        title
                    );

                setGearDraft({
                    title,
                    value: String(
                        getOptionMidpoint(
                            config
                        )
                    ),
                });
            },
            [parts]
        );

    const changeGearDraftValue =
        useCallback((event) => {
            setGearDraft((previous) => ({
                ...previous,
                value: event.target.value,
            }));
        }, []);

    const confirmGearEdit = useCallback(
        () => {
            if (editingGearIndex === null) {
                return;
            }

            const normalized =
                normalizeOption(
                    parts,
                    gearDraft
                );

            setGearOptions((previous) =>
                previous.map(
                    (option, index) =>
                        index ===
                        editingGearIndex
                            ? normalized
                            : option
                )
            );
            setEditingGearIndex(null);
            setSelectedIndex(-1);
        },
        [
            editingGearIndex,
            gearDraft,
            parts,
        ]
    );

    const cancelGearEdit =
        useCallback(() => {
            setEditingGearIndex(null);
        }, []);

    const addMaterialOption = useCallback(() => {
        if (
            animationPlaying ||
            isEditing ||
            materialOptions.length >= MAX_OPTION_COUNT
        ) {
            return;
        }

        setMaterialOptions((previous) => [
            ...previous,
            createDefaultOption(parts),
        ]);
        setSelectedMaterialIndex(-1);
    }, [
        animationPlaying,
        isEditing,
        materialOptions.length,
        parts,
    ]);

    const removeMaterialOption = useCallback(() => {
        if (
            animationPlaying ||
            isEditing ||
            materialOptions.length <= 1
        ) {
            return;
        }

        setMaterialOptions((previous) =>
            previous.slice(0, -1)
        );
        setStabilizedMaterialIndex((previous) =>
            Math.min(
                previous,
                materialOptions.length - 2
            )
        );
        setSelectedMaterialIndex(-1);
    }, [
        animationPlaying,
        isEditing,
        materialOptions.length,
    ]);

    const randomizeMaterialOptions = useCallback(() => {
        if (animationPlaying || isEditing) {
            return;
        }

        const nextOptions = createRandomTitanOptions(
            parts,
            materialGuaranteedOptionTitle
        );

        if (nextOptions.length === 0) {
            return;
        }

        setMaterialOptions(nextOptions);
        setStabilizedMaterialIndex(0);
        setSelectedMaterialIndex(-1);
    }, [
        animationPlaying,
        materialGuaranteedOptionTitle,
        isEditing,
        parts,
    ]);

    const beginMaterialEdit =
        useCallback((index) => {
            if (animationPlaying) {
                return;
            }

            const option = materialOptions[index];

            if (!option) {
                return;
            }

            setEditingGearIndex(null);
            setEditingMaterialIndex(index);
            setMaterialDraft(
                createDraft(option)
            );
        }, [
            animationPlaying,
            materialOptions,
        ]);

    const changeMaterialDraftTitle =
        useCallback(
            (event) => {
                const title =
                    event.target.value;
                const config =
                    getOptionConfig(
                        parts,
                        title
                    );

                setMaterialDraft({
                    title,
                    value: String(
                        getOptionMidpoint(
                            config
                        )
                    ),
                });
            },
            [parts]
        );

    const changeMaterialDraftValue =
        useCallback((event) => {
            setMaterialDraft(
                (previous) => ({
                    ...previous,
                    value: event.target.value,
                })
            );
        }, []);

    const confirmMaterialEdit =
        useCallback(() => {
            if (editingMaterialIndex === null) {
                return;
            }

            const normalized = normalizeOption(
                parts,
                materialDraft
            );

            setMaterialOptions((previous) =>
                previous.map((option, index) =>
                    index === editingMaterialIndex
                        ? normalized
                        : option
                )
            );
            setEditingMaterialIndex(null);
            setSelectedIndex(-1);
            setSelectedMaterialIndex(-1);
        }, [
            editingMaterialIndex,
            materialDraft,
            parts,
        ]);

    const cancelMaterialEdit =
        useCallback(() => {
            setEditingMaterialIndex(null);
        }, []);

    const applyRefineResult =
        useCallback((result) => {
            const historyEntry = {
                ...result.history,
                id:
                    ++historySequenceRef.current,
                createdAt: Date.now(),
            };

            setGearOptions(result.options);
            setSelectedIndex(
                result.history.slotIndex
            );
            setHistory((previous) => [
                historyEntry,
                ...previous,
            ].slice(0, HISTORY_LIMIT));
        }, []);

    const playRefineAnimation =
        useCallback(
            (result, materialIndex) => {
                clearAnimationTimer();
                setAnimationPlaying(true);
                setSelectedIndex(-1);
                setAnimationIndex(-1);
                setSelectedMaterialIndex(-1);
                setMaterialAnimationIndex(-1);

                const playTargetAnimation = () => {
                    setMaterialAnimationIndex(-1);
                    setSelectedMaterialIndex(materialIndex);

                    const targetIndex =
                        result.history.slotIndex;
                    let currentIndex = -1;
                    let stepCount = 0;

                    const nextTargetStep = () => {
                        currentIndex =
                            (currentIndex + 1) %
                            MAX_OPTION_COUNT;
                        stepCount += 1;
                        setAnimationIndex(currentIndex);

                        const canFinish =
                            stepCount >=
                                MIN_ANIMATION_STEPS &&
                            currentIndex === targetIndex;

                        if (canFinish) {
                            animationTimerRef.current =
                                window.setTimeout(() => {
                                    applyRefineResult(result);
                                    setAnimationIndex(-1);
                                    setAnimationPlaying(false);
                                    animationTimerRef.current = null;
                                }, ANIMATION_STEP_MS);

                            return;
                        }

                        animationTimerRef.current =
                            window.setTimeout(
                                nextTargetStep,
                                ANIMATION_STEP_MS
                            );
                    };

                    animationTimerRef.current =
                        window.setTimeout(
                            nextTargetStep,
                            ANIMATION_STEP_MS
                        );
                };

                if (
                    useStabilizer ||
                    materialOptions.length <= 1
                ) {
                    playTargetAnimation();
                    return;
                }

                let currentMaterialIndex = -1;
                let materialStepCount = 0;

                const nextMaterialStep = () => {
                    currentMaterialIndex =
                        (currentMaterialIndex + 1) %
                        materialOptions.length;
                    materialStepCount += 1;
                    setMaterialAnimationIndex(
                        currentMaterialIndex
                    );

                    const canFinish =
                        materialStepCount >=
                            MATERIAL_ANIMATION_STEPS &&
                        currentMaterialIndex === materialIndex;

                    if (canFinish) {
                        animationTimerRef.current =
                            window.setTimeout(
                                playTargetAnimation,
                                ANIMATION_STEP_MS
                            );
                        return;
                    }

                    animationTimerRef.current =
                        window.setTimeout(
                            nextMaterialStep,
                            ANIMATION_STEP_MS
                        );
                };

                animationTimerRef.current =
                    window.setTimeout(
                        nextMaterialStep,
                        ANIMATION_STEP_MS
                    );
            },
            [
                applyRefineResult,
                clearAnimationTimer,
                materialOptions.length,
                useStabilizer,
            ]
        );

    const refine = useCallback(() => {
        if (!canRefine) {
            return;
        }

        const materialIndex = getRandomItem(
            activeMaterialIndices
        );
        const materialOption =
            materialOptions[materialIndex];

        if (!materialOption) {
            return;
        }

        const result = buildRefineResult({
            part: parts,
            currentOptions: gearOptions,
            materialOption,
        });

        if (!result) {
            return;
        }

        result.history.materialIndex = materialIndex;
        result.history.stabilized = useStabilizer;

        if (useAnimation) {
            playRefineAnimation(result, materialIndex);
        } else {
            setSelectedMaterialIndex(materialIndex);
            applyRefineResult(result);
        }
    }, [
        applyRefineResult,
        canRefine,
        gearOptions,
        activeMaterialIndices,
        materialOptions,
        parts,
        playRefineAnimation,
        useAnimation,
        useStabilizer,
    ]);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    const renderOptionEditor = (
        draft,
        onTitleChange,
        onValueChange,
        onConfirm,
        onCancel
    ) => {
        const config = getOptionConfig(
            parts,
            draft.title
        );

        return (<>
            <SEO title={t("TitanRefineSimulator.header.title")}
                description={t("TitanRefineSimulator.header.description")}/>

            <div className="refine-option-editor">
                <select
                    className="form-select form-select-sm"
                    value={draft.title}
                    onChange={onTitleChange}
                    aria-label={t(
                        "TitanRefineSimulator.editor.optionLabel"
                    )}
                >
                    {(gearOptionList[parts] ?? []).map(
                        (option) => (
                            <option
                                value={option.title}
                                key={option.title}
                            >
                                {getOptionName(
                                    option.title
                                )}
                            </option>
                        )
                    )}
                </select>

                <div className="input-group input-group-sm">
                    <input
                        type="text"
                        inputMode="numeric"
                        className="form-control text-end"
                        value={draft.value}
                        onChange={onValueChange}
                        min="0"
                        max={
                            config?.max ??
                            undefined
                        }
                        step="0.01"
                        aria-label={t(
                            "TitanRefineSimulator.editor.valueLabel"
                        )}
                    />
                    <span className="input-group-text">
                        %
                    </span>
                </div>

                <div className="refine-editor-actions">
                    <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={onConfirm}
                        aria-label={t(
                            "TitanRefineSimulator.buttons.confirm"
                        )}
                    >
                        <FaCheck
                            aria-hidden="true"
                        />
                    </button>

                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={onCancel}
                        aria-label={t(
                            "TitanRefineSimulator.buttons.cancel"
                        )}
                    >
                        <FaXmark
                            aria-hidden="true"
                        />
                    </button>
                </div>

                <small className="text-secondary refine-option-limit">
                    {t(
                        "TitanRefineSimulator.editor.allowedRange",
                        {
                            min: formatNumber(
                                config?.min ?? 0
                            ),
                            max: formatNumber(
                                config?.max ?? 0
                            ),
                        }
                    )}
                </small>
            </div>
        </>);
    };

    return (
        <main className="titan-refine-simulator container py-4">
            <header className="titan-refine-header mb-4">
                <span className="badge text-bg-primary mb-2">
                    {t(
                        "TitanRefineSimulator.header.badge"
                    )}
                </span>

                <h1 className="fw-bold mb-2">
                    {t(
                        "TitanRefineSimulator.header.title"
                    )}
                </h1>

                <p className="text-secondary mb-0">
                    {t(
                        "TitanRefineSimulator.header.description"
                    )}
                </p>
            </header>

            <section
                className="card border-0 shadow-sm titan-refine-card mb-4"
                aria-labelledby="refine-part-title"
            >
                <div className="card-body p-4">
                    <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
                        <div>
                            <h2
                                id="refine-part-title"
                                className="h4 fw-bold mb-1"
                            >
                                {t(
                                    "TitanRefineSimulator.settings.partTitle"
                                )}
                            </h2>

                            <p className="small text-secondary mb-0">
                                {t(
                                    "TitanRefineSimulator.settings.partDescription"
                                )}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline-secondary align-self-lg-start"
                            onClick={() =>
                                resetSimulator()
                            }
                            disabled={
                                animationPlaying
                            }
                        >
                            {t(
                                "TitanRefineSimulator.buttons.reset"
                            )}
                        </button>
                    </div>

                    <div className="refine-part-grid">
                        {partsList.map((part) => (
                            <button
                                type="button"
                                className={`refine-part-button ${
                                    parts === part
                                        ? "active"
                                        : ""
                                }`}
                                key={part}
                                onClick={() =>
                                    changePart(part)
                                }
                                disabled={
                                    animationPlaying
                                }
                                aria-pressed={
                                    parts === part
                                }
                            >
                                <img
                                    src={getPartImageUrl(
                                        part
                                    )}
                                    className="refine-part-image"
                                    alt=""
                                    aria-hidden="true"
                                />

                                <span>
                                    {getPartName(part)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <div className="row g-4">
                <div className="col-12 col-xl-7">
                    <section
                        className="card border-0 shadow-sm titan-refine-card h-100"
                        aria-labelledby="refine-gear-title"
                    >
                        <div className="card-body p-4">
                            <div className="d-flex flex-column gap-3 mb-3">
                                <div className="d-flex flex-column flex-sm-row justify-content-between gap-3">
                                    <div>
                                    <h2
                                        id="refine-gear-title"
                                        className="h4 fw-bold mb-1"
                                    >
                                        {t(
                                            "TitanRefineSimulator.gear.title"
                                        )}
                                    </h2>

                                    <p className="small text-secondary mb-0">
                                        {t(
                                            "TitanRefineSimulator.gear.description"
                                        )}
                                    </p>
                                    </div>

                                    <div className="d-flex gap-2 align-self-sm-start">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={
                                            addGearOption
                                        }
                                        disabled={
                                            animationPlaying ||
                                            isEditing ||
                                            gearOptions.length >=
                                                MAX_OPTION_COUNT
                                        }
                                    >
                                        {t(
                                            "TitanRefineSimulator.buttons.addOption"
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={
                                            removeGearOption
                                        }
                                        disabled={
                                            animationPlaying ||
                                            isEditing ||
                                            gearOptions.length <=
                                                1
                                        }
                                    >
                                        {t(
                                            "TitanRefineSimulator.buttons.removeOption"
                                        )}
                                    </button>
                                    </div>
                                </div>

                                <div className="input-group input-group-sm">
                                    <label
                                        className="input-group-text"
                                        htmlFor="refine-gear-guaranteed-option"
                                    >
                                        {t(
                                            "TitanRefineSimulator.material.guaranteedOption"
                                        )}
                                    </label>
                                    <select
                                        id="refine-gear-guaranteed-option"
                                        className="form-select"
                                        value={gearGuaranteedOptionTitle}
                                        onChange={(event) =>
                                            setGearGuaranteedOptionTitle(
                                                event.target.value
                                            )
                                        }
                                        disabled={animationPlaying || isEditing}
                                    >
                                        <option value="">
                                            {t(
                                                "TitanRefineSimulator.material.noGuarantee"
                                            )}
                                        </option>
                                        {(gearOptionList[parts] ?? []).map(
                                            (option) => (
                                                <option
                                                    value={option.title}
                                                    key={option.title}
                                                >
                                                    {getOptionName(option.title)}
                                                </option>
                                            )
                                        )}
                                    </select>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={randomizeGearOptions}
                                        disabled={animationPlaying || isEditing}
                                    >
                                        {t(
                                            "TitanRefineSimulator.buttons.randomize"
                                        )}
                                    </button>
                                </div>
                            </div>

                            <article className="refine-gear-card">
                                <div className="refine-gear-image-panel">
                                    <img
                                        src={getGearImageUrl(
                                            parts
                                        )}
                                        className="refine-gear-image"
                                        alt={t(
                                            "TitanRefineSimulator.gear.imageAlt",
                                            {
                                                gear: getPartName(
                                                    parts
                                                ),
                                            }
                                        )}
                                    />
                                </div>

                                <div className="refine-gear-content">
                                    <h3
                                        className="h5 fw-bold mb-3"
                                        style={{
                                            color: colorList.gold,
                                        }}
                                    >
                                        {getPartName(parts)}
                                    </h3>

                                    <div className="refine-option-list">
                                        {Array.from(
                                            {
                                                length:
                                                    MAX_OPTION_COUNT,
                                            },
                                            (_, index) => {
                                                const option =
                                                    gearOptions[
                                                        index
                                                    ];
                                                const isEditingRow =
                                                    editingGearIndex ===
                                                    index;
                                                const isScanning =
                                                    animationIndex ===
                                                    index;
                                                const isSelected =
                                                    selectedIndex ===
                                                    index;

                                                return (
                                                    <div
                                                        className={`refine-option-row ${
                                                            isScanning
                                                                ? "is-scanning"
                                                                : ""
                                                        } ${
                                                            isSelected
                                                                ? "is-selected"
                                                                : ""
                                                        } ${
                                                            option
                                                                ? ""
                                                                : "is-empty"
                                                        }`}
                                                        key={
                                                            index
                                                        }
                                                    >
                                                        {isEditingRow
                                                            ? renderOptionEditor(
                                                                  gearDraft,
                                                                  changeGearDraftTitle,
                                                                  changeGearDraftValue,
                                                                  confirmGearEdit,
                                                                  cancelGearEdit
                                                              )
                                                            : option
                                                              ? (
                                                                    <button
                                                                        type="button"
                                                                        className="refine-option-display"
                                                                        onClick={() =>
                                                                            beginGearEdit(
                                                                                index
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            animationPlaying
                                                                        }
                                                                        title={getOptionName(
                                                                            option.title
                                                                        )}
                                                                    >
                                                                        <span className="refine-option-name">
                                                                            {getOptionName(
                                                                                option.title
                                                                            )}
                                                                        </span>

                                                                        <span className="refine-option-value">
                                                                            {formatPercent(
                                                                                option.value
                                                                            )}
                                                                        </span>

                                                                        {option.max && (
                                                                            <span className="badge text-bg-warning refine-max-badge">
                                                                                {t(
                                                                                    "TitanRefineSimulator.gear.max"
                                                                                )}
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                )
                                                              : (
                                                                    <div className="refine-empty-option">
                                                                        {t(
                                                                            "TitanRefineSimulator.gear.emptySlot",
                                                                            {
                                                                                slot:
                                                                                    index +
                                                                                    1,
                                                                            }
                                                                        )}
                                                                    </div>
                                                                )}
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>
                            </article>
                        </div>
                    </section>
                </div>

                <div className="col-12 col-xl-5">
                    <section
                        className="card border-0 shadow-sm titan-refine-card h-100"
                        aria-labelledby="refine-material-title"
                    >
                        <div className="card-body p-4">
                            <div className="d-flex flex-column gap-3 mb-3">
                                <div>
                                    <h2
                                        id="refine-material-title"
                                        className="h4 fw-bold mb-1"
                                    >
                                        {t(
                                            "TitanRefineSimulator.material.title"
                                        )}
                                    </h2>

                                    <p className="small text-secondary mb-0">
                                        {t(
                                            "TitanRefineSimulator.material.description"
                                        )}
                                    </p>
                                </div>

                                <div className="d-flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={addMaterialOption}
                                        disabled={
                                            animationPlaying ||
                                            isEditing ||
                                            materialOptions.length >=
                                                MAX_OPTION_COUNT
                                        }
                                    >
                                        {t(
                                            "TitanRefineSimulator.buttons.addOption"
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={removeMaterialOption}
                                        disabled={
                                            animationPlaying ||
                                            isEditing ||
                                            materialOptions.length <= 1
                                        }
                                    >
                                        {t(
                                            "TitanRefineSimulator.buttons.removeOption"
                                        )}
                                    </button>
                                </div>

                                <div className="input-group input-group-sm">
                                    <label
                                        className="input-group-text"
                                        htmlFor="refine-guaranteed-option"
                                    >
                                        {t(
                                            "TitanRefineSimulator.material.guaranteedOption"
                                        )}
                                    </label>
                                    <select
                                        id="refine-guaranteed-option"
                                        className="form-select"
                                        value={materialGuaranteedOptionTitle}
                                        onChange={(event) =>
                                            setMaterialGuaranteedOptionTitle(
                                                event.target.value
                                            )
                                        }
                                        disabled={animationPlaying || isEditing}
                                    >
                                        <option value="">
                                            {t(
                                                "TitanRefineSimulator.material.noGuarantee"
                                            )}
                                        </option>
                                        {(gearOptionList[parts] ?? []).map(
                                            (option) => (
                                                <option
                                                    value={option.title}
                                                    key={option.title}
                                                >
                                                    {getOptionName(option.title)}
                                                </option>
                                            )
                                        )}
                                    </select>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={randomizeMaterialOptions}
                                        disabled={animationPlaying || isEditing}
                                    >
                                        {t(
                                            "TitanRefineSimulator.buttons.randomize"
                                        )}
                                    </button>
                                </div>
                            </div>

                            <article className="refine-material-card">
                                <div className="refine-material-image-panel">
                                    <img
                                        src={getGearImageUrl(
                                            parts
                                        )}
                                        className="refine-material-image"
                                        alt={t(
                                            "TitanRefineSimulator.material.imageAlt",
                                            {
                                                gear: getPartName(
                                                    parts
                                                ),
                                            }
                                        )}
                                    />
                                </div>

                                <div className="refine-material-content">
                                    <h3
                                        className="h5 fw-bold mb-3"
                                        style={{
                                            color: colorList.gold,
                                        }}
                                    >
                                        {getPartName(parts)}
                                    </h3>

                                    <div className="refine-option-list">
                                        {materialOptions.map((option, index) => {
                                            const isEditingRow =
                                                editingMaterialIndex === index;
                                            const isScanning =
                                                materialAnimationIndex === index;
                                            const isSelected =
                                                selectedMaterialIndex === index;
                                            const isStabilized =
                                                useStabilizer &&
                                                stabilizedMaterialIndex === index;

                                            return (
                                                <div
                                                    className={`refine-option-row ${
                                                        isScanning
                                                            ? "is-scanning"
                                                            : ""
                                                    } ${
                                                        isSelected
                                                            ? "is-selected"
                                                            : ""
                                                    } ${
                                                        isStabilized
                                                            ? "is-stabilized"
                                                            : ""
                                                    }`}
                                                    key={index}
                                                >
                                                    {isEditingRow
                                                        ? renderOptionEditor(
                                                              materialDraft,
                                                              changeMaterialDraftTitle,
                                                              changeMaterialDraftValue,
                                                              confirmMaterialEdit,
                                                              cancelMaterialEdit
                                                          )
                                                        : (
                                                              <>
                                                                  <button
                                                                      type="button"
                                                                      className="refine-option-display refine-material-option"
                                                                      onClick={() =>
                                                                          beginMaterialEdit(
                                                                              index
                                                                          )
                                                                      }
                                                                      disabled={
                                                                          animationPlaying
                                                                      }
                                                                      title={getOptionName(
                                                                          option.title
                                                                      )}
                                                                  >
                                                                      <span className="refine-option-name">
                                                                          {getOptionName(
                                                                              option.title
                                                                          )}
                                                                      </span>
                                                                      <span className="refine-option-value">
                                                                          {formatPercent(
                                                                              option.value
                                                                          )}
                                                                      </span>
                                                                      {option.max && (
                                                                          <span className="badge text-bg-warning refine-max-badge">
                                                                              {t(
                                                                                  "TitanRefineSimulator.gear.max"
                                                                              )}
                                                                          </span>
                                                                      )}
                                                                  </button>

                                                                  <label
                                                                      className={`refine-stabilizer-choice ${
                                                                          useStabilizer
                                                                              ? "is-active"
                                                                              : "is-inactive"
                                                                      }`}
                                                                  >
                                                                      <input
                                                                          className="visually-hidden"
                                                                          type="radio"
                                                                          name="stabilized-material-option"
                                                                          checked={
                                                                              isStabilized
                                                                          }
                                                                          onChange={() => {
                                                                              setStabilizedMaterialIndex(
                                                                                  index
                                                                              );
                                                                              setUseStabilizer(
                                                                                  true
                                                                              );
                                                                              setSelectedMaterialIndex(
                                                                                  -1
                                                                              );
                                                                          }}
                                                                          disabled={
                                                                              animationPlaying ||
                                                                              isEditing ||
                                                                              materialOptions.length <=
                                                                                  1
                                                                          }
                                                                      />
                                                                      <span
                                                                          className={`refine-stabilizer-mark ${
                                                                              isStabilized
                                                                                  ? "is-selected"
                                                                                  : ""
                                                                          }`}
                                                                          aria-hidden="true"
                                                                      >
                                                                          {isStabilized ? (
                                                                              <FaCheck />
                                                                          ) : null}
                                                                      </span>
                                                                      <span className="visually-hidden">
                                                                          {isStabilized
                                                                              ? t(
                                                                                    "TitanRefineSimulator.stabilizer.selected"
                                                                                )
                                                                              : t(
                                                                                    "TitanRefineSimulator.stabilizer.selectOption"
                                                                                )}
                                                                      </span>
                                                                  </label>
                                                              </>
                                                          )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </article>

                            <div className="refine-stabilizer-panel mt-3">
                                <img
                                    src={stabilizerImageUrl}
                                    className="refine-stabilizer-image"
                                    alt={t(
                                        "TitanRefineSimulator.stabilizer.imageAlt"
                                    )}
                                />
                                <div className="flex-grow-1">
                                    <div className="form-check form-switch mb-1">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            role="switch"
                                            id="refine-use-stabilizer"
                                            checked={useStabilizer}
                                            onChange={(event) => {
                                                setUseStabilizer(
                                                    event.target.checked
                                                );
                                                setSelectedMaterialIndex(-1);
                                            }}
                                            disabled={
                                                animationPlaying ||
                                                isEditing ||
                                                materialOptions.length <= 1
                                            }
                                        />
                                        <label
                                            className="form-check-label fw-bold"
                                            htmlFor="refine-use-stabilizer"
                                        >
                                            {t(
                                                "TitanRefineSimulator.stabilizer.use"
                                            )}
                                        </label>
                                    </div>
                                    <p className="small text-secondary mb-0">
                                        {t(
                                            useStabilizer
                                                ? "TitanRefineSimulator.stabilizer.activeDescription"
                                                : "TitanRefineSimulator.stabilizer.description"
                                        )}
                                    </p>
                                    {useStabilizer && (
                                        <div className="small fw-semibold text-warning mt-1">
                                            {t(
                                                "TitanRefineSimulator.stabilizer.cost",
                                                {
                                                    count:
                                                        materialOptions.length -
                                                        1,
                                                }
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="alert alert-light border small mt-3 mb-0">
                                {t(
                                    "TitanRefineSimulator.material.rule"
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <section className="card border-0 shadow-sm titan-refine-card mt-4">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-center">
                        <div className="col-12 col-lg">
                            <div className="form-check form-switch mb-2">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    id="refine-animation-available"
                                    checked={
                                        useAnimation
                                    }
                                    onChange={(event) =>
                                        setUseAnimation(
                                            event.target
                                                .checked
                                        )
                                    }
                                    disabled={
                                        animationPlaying
                                    }
                                />

                                <label
                                    className="form-check-label"
                                    htmlFor="refine-animation-available"
                                >
                                    {t(
                                        "TitanRefineSimulator.settings.useAnimation"
                                    )}
                                </label>
                            </div>

                            <div className="small text-secondary">
                                {activeMaterialIndices.length >
                                0
                                    ? t(
                                          "TitanRefineSimulator.status.eligibleMaterials",
                                          {
                                              count: activeMaterialIndices.length,
                                          }
                                      )
                                    : t(
                                          "TitanRefineSimulator.status.noEligible"
                                      )}
                            </div>
                        </div>

                        <div className="col-12 col-lg-auto">
                            <button
                                type="button"
                                data-analytics-action="run_refine"
                                className="btn btn-primary btn-lg refine-submit-button"
                                onClick={refine}
                                disabled={!canRefine}
                            >
                                {animationPlaying
                                    ? t(
                                          "TitanRefineSimulator.buttons.refining"
                                      )
                                    : t(
                                          "TitanRefineSimulator.buttons.refine"
                                      )}
                            </button>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="alert alert-warning mt-3 mb-0">
                            {t(
                                "TitanRefineSimulator.status.finishEditing"
                            )}
                        </div>
                    )}

                    {!isEditing &&
                        !animationPlaying &&
                        activeMaterialIndices.length ===
                            0 && (
                            <div className="alert alert-danger mt-3 mb-0">
                                {t(
                                    "TitanRefineSimulator.status.allMax"
                                )}
                            </div>
                        )}
                </div>
            </section>

            <section
                className="card border-0 shadow-sm titan-refine-card mt-4"
                aria-labelledby="refine-statistics-title"
            >
                <div className="card-body p-4">
                    <div className="d-flex flex-column flex-sm-row justify-content-between gap-3 mb-3">
                        <div>
                            <h2
                                id="refine-statistics-title"
                                className="h4 fw-bold mb-1"
                            >
                                {t(
                                    "TitanRefineSimulator.statistics.title"
                                )}
                            </h2>

                            <p className="small text-secondary mb-0">
                                {t(
                                    "TitanRefineSimulator.statistics.description"
                                )}
                            </p>
                        </div>

                        <button
                            type="button"
                            data-analytics-action="clear_history"
                            className="btn btn-sm btn-outline-secondary align-self-sm-start"
                            onClick={clearHistory}
                            disabled={
                                history.length === 0 ||
                                animationPlaying
                            }
                        >
                            {t(
                                "TitanRefineSimulator.buttons.clearHistory"
                            )}
                        </button>
                    </div>

                    <div className="row g-3">
                        {[
                            [
                                "total",
                                statistics.total,
                            ],
                            [
                                "added",
                                statistics.added,
                            ],
                            [
                                "upgraded",
                                statistics.upgraded,
                            ],
                            [
                                "replaced",
                                statistics.replaced,
                            ],
                            [
                                "capped",
                                statistics.capped,
                            ],
                        ].map(([key, value]) => (
                            <div
                                className="col-6 col-lg"
                                key={key}
                            >
                                <div className="refine-stat-card h-100">
                                    <div className="small text-secondary">
                                        {t(
                                            `TitanRefineSimulator.statistics.${key}`
                                        )}
                                    </div>

                                    <strong className="fs-4">
                                        {formatNumber(
                                            value
                                        )}
                                    </strong>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section
                className="card border-0 shadow-sm titan-refine-card mt-4"
                aria-labelledby="refine-history-title"
            >
                <div className="card-body p-4">
                    <h2
                        id="refine-history-title"
                        className="h4 fw-bold mb-3"
                    >
                        {t(
                            "TitanRefineSimulator.history.title"
                        )}
                    </h2>

                    {history.length === 0 ? (
                        <div className="alert alert-secondary mb-0">
                            {t(
                                "TitanRefineSimulator.history.empty"
                            )}
                        </div>
                    ) : (
                        <div className="refine-history-list">
                            {history.map((entry) => (
                                <article
                                    className="refine-history-item"
                                    key={entry.id}
                                >
                                    <div className="d-flex justify-content-between gap-3 mb-1">
                                        <strong>
                                            {t(
                                                "TitanRefineSimulator.history.slot",
                                                {
                                                    slot:
                                                        entry.slotIndex +
                                                        1,
                                                }
                                            )}
                                        </strong>

                                        <time className="small text-secondary">
                                            {timeFormatter.format(
                                                entry.createdAt
                                            )}
                                        </time>
                                    </div>

                                    <div className="small text-secondary mb-1">
                                        {t(
                                            "TitanRefineSimulator.history.material",
                                            {
                                                option: getOptionName(
                                                    entry.material.title
                                                ),
                                                value: formatNumber(
                                                    entry.material.value
                                                ),
                                            }
                                        )}
                                        {entry.stabilized && (
                                            <span className="badge text-bg-warning ms-2">
                                                {t(
                                                    "TitanRefineSimulator.history.stabilized"
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    {entry.action ===
                                        "added" && (
                                        <p className="mb-0">
                                            {t(
                                                "TitanRefineSimulator.history.added",
                                                {
                                                    option: getOptionName(
                                                        entry
                                                            .after
                                                            .title
                                                    ),
                                                    value: formatNumber(
                                                        entry
                                                            .after
                                                            .value
                                                    ),
                                                }
                                            )}
                                        </p>
                                    )}

                                    {entry.action ===
                                        "upgraded" && (
                                        <p className="mb-0">
                                            {t(
                                                "TitanRefineSimulator.history.upgraded",
                                                {
                                                    option: getOptionName(
                                                        entry
                                                            .after
                                                            .title
                                                    ),
                                                    before: formatNumber(
                                                        entry
                                                            .before
                                                            .value
                                                    ),
                                                    after: formatNumber(
                                                        entry
                                                            .after
                                                            .value
                                                    ),
                                                    increase:
                                                        formatNumber(
                                                            entry.increase
                                                        ),
                                                }
                                            )}

                                            {entry.capped && (
                                                <span className="badge text-bg-warning ms-2">
                                                    {t(
                                                        "TitanRefineSimulator.gear.max"
                                                    )}
                                                </span>
                                            )}
                                        </p>
                                    )}

                                    {entry.action ===
                                        "replaced" && (
                                        <p className="mb-0">
                                            {t(
                                                "TitanRefineSimulator.history.replaced",
                                                {
                                                    beforeOption:
                                                        getOptionName(
                                                            entry
                                                                .before
                                                                .title
                                                        ),
                                                    afterOption:
                                                        getOptionName(
                                                            entry
                                                                .after
                                                                .title
                                                        ),
                                                    value: formatNumber(
                                                        entry
                                                            .after
                                                            .value
                                                    ),
                                                }
                                            )}
                                        </p>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="card border-0 shadow-sm titan-refine-card mt-5">
                <div className="card-body p-4 p-lg-5">
                    <h2 className="h3 fw-bold mb-3">
                        {t(
                            "TitanRefineSimulator.guide.introductionTitle"
                        )}
                    </h2>

                    <p>
                        {t(
                            "TitanRefineSimulator.guide.introduction1"
                        )}
                    </p>

                    <p>
                        {t(
                            "TitanRefineSimulator.guide.introduction2"
                        )}
                    </p>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t(
                            "TitanRefineSimulator.guide.rulesTitle"
                        )}
                    </h2>

                    <ol className="lh-lg">
                        <li>
                            {t(
                                "TitanRefineSimulator.guide.rule0"
                            )}
                        </li>
                        <li>
                            {t(
                                "TitanRefineSimulator.guide.rule1"
                            )}
                        </li>
                        <li>
                            {t(
                                "TitanRefineSimulator.guide.rule2"
                            )}
                        </li>
                        <li>
                            {t(
                                "TitanRefineSimulator.guide.rule3"
                            )}
                        </li>
                        <li>
                            {t(
                                "TitanRefineSimulator.guide.rule4"
                            )}
                        </li>
                    </ol>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold mb-3">
                        {t(
                            "TitanRefineSimulator.guide.rangeTitle"
                        )}
                    </h2>

                    <div className="table-responsive">
                        <table className="table table-bordered align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th scope="col">
                                        {t(
                                            "TitanRefineSimulator.guide.optionType"
                                        )}
                                    </th>
                                    <th
                                        scope="col"
                                        className="text-end"
                                    >
                                        {t(
                                            "TitanRefineSimulator.guide.minimumIncrease"
                                        )}
                                    </th>
                                    <th
                                        scope="col"
                                        className="text-end"
                                    >
                                        {t(
                                            "TitanRefineSimulator.guide.maximumIncrease"
                                        )}
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {gearOptionRange.map(
                                    (range) => (
                                        <tr
                                            key={
                                                range.type
                                            }
                                        >
                                            <td>
                                                {getRangeTypeName(
                                                    range.type
                                                )}
                                            </td>
                                            <td className="text-end">
                                                {formatPercent(
                                                    range.min
                                                )}
                                            </td>
                                            <td className="text-end">
                                                {formatPercent(
                                                    range.max
                                                )}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>

                    <p className="small text-secondary mt-2 mb-0">
                        {t(
                            "TitanRefineSimulator.guide.source"
                        )}
                    </p>

                    <div className="alert alert-warning mt-4 mb-0">
                        <strong className="d-block mb-1">
                            {t(
                                "TitanRefineSimulator.guide.noticeTitle"
                            )}
                        </strong>

                        {t(
                            "TitanRefineSimulator.guide.notice"
                        )}
                    </div>
                </div>
            </section>

            <section className="card border-0 shadow-sm titan-refine-card mt-4">
                <div className="card-body p-4 p-lg-5">
                    <h2 className="h3 fw-bold mb-4">
                        {t(
                            "TitanRefineSimulator.faq.title"
                        )}
                    </h2>

                    <div
                        className="accordion"
                        id="titanRefineFaq"
                    >
                        {[1, 2, 3].map(
                            (number) => (
                                <div
                                    className="accordion-item"
                                    key={
                                        number
                                    }
                                >
                                    <h3
                                        className="accordion-header"
                                        id={`titan-refine-faq-heading-${number}`}
                                    >
                                        <button
                                            className={`accordion-button ${
                                                number ===
                                                1
                                                    ? ""
                                                    : "collapsed"
                                            }`}
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target={`#titan-refine-faq-${number}`}
                                            aria-expanded={
                                                number ===
                                                1
                                            }
                                            aria-controls={`titan-refine-faq-${number}`}
                                        >
                                            {t(
                                                `TitanRefineSimulator.faq.question${number}`
                                            )}
                                        </button>
                                    </h3>

                                    <div
                                        id={`titan-refine-faq-${number}`}
                                        className={`accordion-collapse collapse ${
                                            number ===
                                            1
                                                ? "show"
                                                : ""
                                        }`}
                                        aria-labelledby={`titan-refine-faq-heading-${number}`}
                                        data-bs-parent="#titanRefineFaq"
                                    >
                                        <div className="accordion-body">
                                            {t(
                                                `TitanRefineSimulator.faq.answer${number}`
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}
