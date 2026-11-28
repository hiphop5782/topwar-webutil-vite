import LanguageRouterLink from '@src/components/template/LanguageRouterLink';

export default function ChatDataResult({ result }) {
    return <div className="chatbot-data-result">
        {result.rows?.length > 0 && <div className="chatbot-data-table" tabIndex={0} role="region" aria-label="조회 결과 표"><table><thead><tr>{result.columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column}>{value ?? '미수집'}</td>)}</tr>)}</tbody></table></div>}
        {result.notes?.map(note => <p className="chatbot-data-note" key={note}>{note}</p>)}
        {result.sources?.length > 0 && <details className="chatbot-data-sources"><summary>데이터 근거 · {result.sources.length}개</summary><ul>{result.sources.map(source => <li key={source.path}>{source.label}<br /><small>{source.path} · {source.at || '수집 시각 미제공'}</small></li>)}</ul></details>}
        <div className="chatbot-data-links">{result.links?.map(link => <LanguageRouterLink key={link.path} to={link.path}>{link.label} ↗</LanguageRouterLink>)}</div>
    </div>;
}
