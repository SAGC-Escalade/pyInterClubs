const { useState, useEffect, useRef } = React;
const { InputGroup } = ReactBootstrap;
import Observer from './observer.jsx';

export default function Autocomplete({
    endpoint,
    name,
    value,
    key = "id",
    label = "label",
    minLength = 3,
    nullable = true,
    id,
    isInvalid = false,
    isValid = false,
    onChange,
    placeholder = "Rechercher...",
    className = "",
    helptext,
    children,
    size = null,
}) {
    const inputRef = useRef(null);
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [selectedItem, setSelectedItem] = useState(value ?? null);

    const handleSelect = (item, input = "") => {
        setSelectedItem(item);
        setQuery(item ? item[label] : input);
        if (onChange) { onChange(item ? item[key] : null); }
    };

    return (
        <Observer endpoint={endpoint}>
            {({ data, errors, status, action }) => {
                useEffect(() => {
                    if (value && data) {
                        const selected = data.find(item => item[key] === value);
                        if (selected) {
                            handleSelect(selected);
                        }
                    } else if (!value) {
                        handleSelect(null, query);
                    }
                }, [value, data]);

                const show = isFocused && (query?.length >= minLength) && (data || status.isError || status.isLoading) && !selectedItem;

                return (
                    <div className={`position-relative ${className}` + (isValid ? " is-valid" : "") + (isInvalid ? " is-invalid" : "")}>
                        <InputGroup hasValidation={isValid || isInvalid} size={size}>
                            <input
                                ref={inputRef}
                                id={id ?? `id_${name}`}
                                type="text"
                                name={name}
                                value={selectedItem ? (!!children ? children(selectedItem) : selectedItem[label]) : (query ?? "")}
                                placeholder={placeholder}
                                className={"form-control" + (size ? ` form-control-${size}` : "") + (isValid ? " is-valid" : "") + (isInvalid ? " is-invalid" : "")}
                                onChange={(e) => {
                                    const q = e.target.value;
                                    if (!!q && (q.length >= minLength))
                                        action(typeof q === 'string' ? `?q=${q}` : `${q}/`);
                                    handleSelect(null, q);
                                }}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setTimeout(() => setIsFocused(false), 500)}
                            />
                            {nullable && (
                                <button className={"btn btn-outline-secondary" + (size ? ` btn-${size}` : "")} type="button" onClick={() => handleSelect(null)}>
                                    <i className="fa-solid fa-eraser"></i>
                                </button>
                            )}
                        </InputGroup>
                        {helptext && <div className="form-text">{helptext}</div>}
                        {show && (
                            <ul className="list-group position-absolute w-100" style={{ zIndex: 1000 }}>
                                {status.isLoading && (
                                    <div className="list-group-item">
                                        <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                                        <span role="status"> Chargement...</span>
                                    </div>
                                )}
                                {status.isError && <div className="list-group-item text-danger">Erreur de chargement</div>}
                                {data && data.length === 0 && <li className="list-group-item">Aucun résultat trouvé</li>}
                                {data && Array.isArray(data) && data.map((item) => (
                                    <li key={item[key]} className="list-group-item list-group-item-action" onClick={() => handleSelect(item)}>
                                        {!!children ? children(item) : item[label]}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                );
            }}
        </Observer>
    );
}
