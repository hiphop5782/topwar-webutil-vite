import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { loadServerDirectory } from "@src/services/topwarDataRepository";

import "./ServerDirectory.css";

const GROUP_COLORS = ["#6143a6", "#006b68", "#a23d19", "#235ba8", "#9b306c", "#58651c", "#8c4c13"];

const unique = values => [...new Set(values)].sort((a, b) => a - b);

export default function ServerDirectory() {
    const { t, i18n } = useTranslation("viewer");
    const text = (key, options) => t(`serverDirectory.${key}`, options);
    const [params, setParams] = useSearchParams();
    const query = params.get("q") || "";
    const [data, setData] = useState(null);
    const [status, setStatus] = useState("loading");
    const [attempt, setAttempt] = useState(0);
    useLayoutEffect(() => {
        document.documentElement.dataset.serverDirectoryReady = "false";
        return () => { delete document.documentElement.dataset.serverDirectoryReady; };
    }, []);
    useEffect(() => {
        let active = true;
        loadServerDirectory().then(value => {
            if (!value?.seasons || value.ok === false || !Object.values(value.seasons).every(season => Array.isArray(season.servers))) {
                throw new Error("Invalid server directory");
            }
            if (active) { setData(value); setStatus("success"); }
        }).catch(() => { if (active) setStatus("error"); });
        return () => { active = false; };
    }, [attempt]);
    useEffect(() => {
        if (status === "loading") return;
        const frame = requestAnimationFrame(() => {
            document.documentElement.dataset.serverDirectoryReady = "true";
            document.dispatchEvent(new Event("server-directory-ready"));
        });
        return () => cancelAnimationFrame(frame);
    }, [status]);
    const seasons = useMemo(() => Object.entries(data?.seasons || {}).map(([name, value]) => ({
        name, servers: unique(value.servers), groups: value.groups || {}, subgroups: value.subgroups || {},
    })), [data]);
    const groupStyles = useMemo(() => {
        const keys = [...new Set(seasons.flatMap(season => Object.entries(season.subgroups)
            .flatMap(([kind, groups]) => Object.keys(groups).map(name => kind + "/" + name))))].sort();
        return new Map(keys.map((key, index) => [key, { "--server-group-color": GROUP_COLORS[index % GROUP_COLORS.length] }]));
    }, [seasons]);
    const serverGroup = (season, id) => Object.entries(season.subgroups)
        .flatMap(([kind, groups]) => Object.entries(groups).map(([name, ids]) => ({ kind, name, ids })))
        .find(group => group.ids.includes(id));
    const seasonLabel = name => name === "엔트리 시즌" ? text("entry") : name === "챔피언 시즌" ? text("champion") : /^\d+시즌$/.test(name) ? text("season", { number: name.match(/\d+/)[0] }) : name;
    const needle = query.trim().toLocaleLowerCase();
    const matches = value => String(value).toLocaleLowerCase().includes(needle);
    const filtered = seasons.map(season => {
        const groupMatches = new Set();
        Object.entries(season.groups).forEach(([name, ids]) => {
            if (matches(text(name)) || matches(name)) ids.forEach(id => groupMatches.add(id));
        });
        Object.values(season.subgroups).forEach(groups => Object.entries(groups).forEach(([name, ids]) => {
            if (matches(name)) ids.forEach(id => groupMatches.add(id));
        }));
        return { ...season, visible: season.servers.filter(id => matches(id) || matches(season.name) || matches(seasonLabel(season.name)) || groupMatches.has(id)) };
    }).filter(season => season.visible.length);
    const total = unique(seasons.flatMap(season => season.servers)).length;
    const resultCount = unique(filtered.flatMap(season => season.visible)).length;
    const number = value => new Intl.NumberFormat(i18n.resolvedLanguage).format(value);
    return <section aria-labelledby="server-directory-title" aria-busy={status === "loading"}>
        <h1 id="server-directory-title">{text("title")}</h1>
        <p className="text-secondary">{text("description")}</p>
        <label htmlFor="server-directory-search" className="form-label">{text("search")}</label>
        <input id="server-directory-search" type="search" className="form-control mb-4" value={query} onChange={event => {
            const next = new URLSearchParams(params);
            if (event.target.value) next.set("q", event.target.value); else next.delete("q");
            setParams(next, { replace: true });
        }}/>
        {status === "loading" && <p role="status">{text("loading")}</p>}
        {status === "error" && <div role="alert" className="alert alert-warning">{text("error")} <button className="btn btn-outline-primary" onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>{text("retry")}</button></div>}
        {status === "success" && <>
            <div className="row g-3 mb-3" aria-live="polite">
                {[["total", total], ["seasons", seasons.length], ["results", resultCount]].map(([label, count]) => <div className="col-12 col-sm-4" key={label}><div className="card h-100"><div className="card-body"><span>{text(label)}</span><strong className="d-block display-6 text-primary">{number(count)}</strong></div></div></div>)}
            </div>
            <p className="small text-secondary">{text("overlap")}</p>
            {filtered.length === 0 && <p role="status">{text("empty")}</p>}
            {filtered.map(season => <section key={season.name} className="card mb-4">
                <div className="card-header d-flex flex-wrap align-items-center gap-2"><h2 className="h5 mb-0">{seasonLabel(season.name)}</h2><span className="badge bg-primary">{text("count", { count: season.servers.length })}</span>{needle && <span className="small">{text("results")}: {number(season.visible.length)}</span>}</div>
                <div className="card-body">
                    <div className="d-flex flex-wrap gap-2 mb-3">{Object.entries(season.groups).map(([name, ids]) => <span key={name} className="badge bg-secondary">{text(name)}: {number(unique(ids).length)}</span>)}</div>
                    <div className="d-flex flex-wrap gap-2">{season.visible.map(id => {
                        const group = serverGroup(season, id);
                        const label = group ? text(group.kind) + " · " + group.name : text("normal");
                        return <LanguageRouterLink key={id} to={"/information/data/server?server=" + id}
                            className={group ? "btn server-group-link" : "btn btn-outline-secondary"}
                            style={group ? groupStyles.get(group.kind + "/" + group.name) : undefined}
                            title={label} aria-label={text("detail", { server: id }) + " · " + label}>
                            {id}{group && <small className="server-group-label">{group.name}</small>}
                        </LanguageRouterLink>;
                    })}</div>
                    {Object.entries(season.subgroups).map(([kind, groups]) => Object.entries(groups).map(([name, ids]) => {
                        const visible = unique(ids).filter(id => season.visible.includes(id));
                        if (!visible.length) return null;
                        return <details className="mt-3 server-group-panel" style={groupStyles.get(kind + "/" + name)} key={`${kind}-${name}`}><summary>{text(kind)} · {name} ({number(unique(ids).length)})</summary><div className="d-flex flex-wrap gap-2 mt-2">{visible.map(id => <LanguageRouterLink key={id} to={`/information/data/server?server=${id}`} className="btn btn-sm server-group-link" aria-label={text("detail", { server: id }) + " · " + text(kind) + " · " + name}>{id}</LanguageRouterLink>)}</div></details>;
                    }))}
                </div>
            </section>)}
            {data.generatedAt && Number.isFinite(Date.parse(data.generatedAt)) && <p className="small text-secondary">{text("updated")}: <time dateTime={data.generatedAt}>{new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.generatedAt))}</time></p>}
        </>}
        <p className="small text-secondary">{text("dates")}</p>
        <a href="https://github.com/hiphop5782/topwar-json/blob/main/servers/servers-object.json" target="_blank" rel="noreferrer">{text("source")}</a>
    </section>;
}
