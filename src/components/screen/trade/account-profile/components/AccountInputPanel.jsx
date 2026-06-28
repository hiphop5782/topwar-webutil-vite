export default function AccountInputPanel({
    rawText,
    jsonText,
    parseError,
    jsonError,
    onRawTextChange,
    onJsonTextChange,
    onAnalyze,
    onApplyJson,
    onLoadSample,
}) {
    return (
        <section className="account-profile-input-panel">
            <div className="account-profile-input-section">
                <div className="account-profile-input-header">
                    <h2 className="account-profile-input-title">Account Text</h2>
                    <button className="btn btn-outline-secondary btn-sm" type="button" onClick={onLoadSample}>
                        Load Sample
                    </button>
                </div>
                <textarea
                    className="form-control account-profile-textarea"
                    value={rawText}
                    onChange={(event) => onRawTextChange(event.target.value)}
                    placeholder="Paste account description text here."
                />
                {parseError ? (
                    <div className="account-profile-error-message">{parseError}</div>
                ) : null}
                <button className="btn btn-primary mt-3" type="button" onClick={onAnalyze}>
                    Analyze Text
                </button>
            </div>

            <div className="account-profile-input-section">
                <h2 className="account-profile-input-title">JSON Editor</h2>
                <textarea
                    className="form-control account-profile-json-editor"
                    value={jsonText}
                    onChange={(event) => onJsonTextChange(event.target.value)}
                    spellCheck="false"
                />
                {jsonError ? (
                    <div className="account-profile-error-message">{jsonError}</div>
                ) : null}
                <button className="btn btn-dark mt-3" type="button" onClick={onApplyJson}>
                    Apply JSON
                </button>
            </div>
        </section>
    );
}
