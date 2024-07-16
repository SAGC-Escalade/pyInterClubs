const { useState, useEffect, useRef } = React;
const { useQuery } = ReactQuery;
const { InputGroup } = ReactBootstrap;

/*
 * Autocomplete
 * Il propose de l'autocompletion via une requête GET sur une API REST/json
 */

export default function Autocomplete({
    endpoint,
    name,
    defaultValue,
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
    async function fetchItems(query) {
        const url = `/api/${endpoint}/` + (typeof query === 'string' ? `?q=${query}` : `${query}/`);
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status == 400) {
                throw new Error(JSON.stringify(await response.json()));
            } else {
                throw new Error(JSON.stringify({
                    non_field_errors: "Une erreur est survenue, réessayez ou contactez un administrateur.",
                    message: "Erreur " + response.status + ": " + response.statusText,
                    debug: await response.text(),
                }));
            }
        }
        return await response.json();
    }

    const inputRef = useRef(null);
    const [query, setQuery] = useState(defaultValue ?? "");
    const [isFocused, setIsFocused] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const { data, error, isLoading } = useQuery(
        ['search', query],
        () => fetchItems(query),
        { enabled: (!!query && (typeof query === 'number' || query.length >= minLength)), }
    );

    useEffect(() => {
        if (data && !Array.isArray(data)) {
            setSelectedItem(data);
            setQuery(data[label]);
        }
    }, [data]);

    const handleSelect = (item, input="") => {
        setSelectedItem(item);
        setQuery(item ? item[label] : input);
        if (onChange) { onChange(item ? item[key] : null); }
    }

    const show = isFocused && (data || error || isLoading) && !selectedItem;

    return (
        <div className={`position-relative ${className}` + (isValid?" is-valid":"") + (isInvalid?" is-invalid":"")}>
            <InputGroup hasValidation={isValid || isInvalid} size={size}>
                <input
                    ref={inputRef}
                    id={id ?? `id_${name}`}
                    type="text"
                    name={name}
                    value={selectedItem ? (!!children ? children(selectedItem) : selectedItem[label]) : (query ?? "")}
                    placeholder={placeholder}
                    className={"form-control" + (size?`form-control-${size}`:"") + (isValid?" is-valid":"") + (isInvalid?" is-invalid":"")}
                    onChange={(e) => handleSelect(null, e.target.value)}
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
                    {isLoading && (
                        <div className="list-group-item">
                            <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                            <span role="status"> Chargement...</span>
                        </div>
                    )}
                    {error && <div className="list-group-item text-danger">Erreur de chargement</div>}
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
}
