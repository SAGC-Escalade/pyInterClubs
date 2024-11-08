const { useState, useEffect, useRef, useCallback } = React;
const { InputGroup, DropdownMenu, DropdownItem, Button } = ReactBootstrap;
import { useCRUDHandler } from './observer.jsx';

export default function Autocomplete({
    queryKey, endpoint, queryString, children, value, onChange, key = 'id',
    nullable = true, minLength = 3,
    className, isValid, isInvalid, placeholder = "Rechercher...", size,
    delay = 500
}) {
    const [searchTerm, setSearchTerm] = useState('');       // Ce qui est affiché dans le input
    const [searchQuery, setSearchQuery] = useState('');     // Ce qui est recherché
    const [selectedItem, setSelectedItem] = useState(null); // L'élement sélectionné
    const [hasFocus, setHasFocus] = useState(false);
    const inputRef = useRef(null);
    const timeout = useRef(null);
    const { data, errors, status, action } = useCRUDHandler({ queryKey, endpoint, enabled: false });

    const handleInputChange = (event) => {
        handleSelectItem(null, event.target.value, false);
        updateSearchQuery(event.target.value, searchQuery);
    };

    // TODO : Gérer le debounce en interne de cette fonction de manière à le zapper quand le searchTerm n'est pas valide
    // (et supprimer direct le searchQuery de manière à ne pas afficher la liste durant 300ms)
    const updateSearchQuery = useCallback(
        (query, current) => {
            clearTimeout(timeout.current);
            if (query.length >= minLength) {
                timeout.current = setTimeout(() => setSearchQuery(query), delay);
            } else if (current != "") {
                setSearchQuery("");
            }
        },
        []
    );

    const handleSelectItem = (item, txt = '', propagate = true) => {
        setSearchTerm(item ? children(item) : txt);
        if (!item || !selectedItem || item[key] != selectedItem[key]) {
            setSelectedItem(item);
            if (onChange && propagate)
                onChange(item);
        }
    };

    useEffect(() => {
        if (value && selectedItem && selectedItem[key] !== value[key]) {
            if (typeof value === 'string') action('read', null, `q=${value}${queryString ? '&' + queryString : ''}`);
            else action(`${value[key]}/${queryString ? '?' + queryString : ''}`);
        } else if (value && !selectedItem) {
            setSearchTerm(children(value));
            setSelectedItem(value);
        } else if (!value)
            handleSelectItem(null);
    }, [value]);

    useEffect(() => {
        if (searchQuery) {
            if (typeof searchQuery === 'string') action('read', null, `q=${searchQuery}${queryString ? '&' + queryString : ''}`);
            else action(`${searchQuery}/${queryString ? '?' + queryString : ''}`);
        }
    }, [searchQuery]);

    useEffect(() => {
        if (data && !Array.isArray(data))
            handleSelectItem(data);
    }, [data]);

    const searchResults = status.isSuccess && searchQuery && !selectedItem ? data : [];
    const showDropdown = hasFocus && (data || status.isError || status.isLoading) && searchQuery && !selectedItem;

    return (
        <div className={className + (isValid ? " is-valid" : "") + (isInvalid ? " is-invalid" : "")}>
            <InputGroup size={size}>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    placeholder={placeholder}
                    onChange={handleInputChange}
                    onFocus={() => setHasFocus(true)}
                    onBlur={() => setHasFocus(false)}
                    className={"form-control" + (size ? ` form-control-${size}` : "") + (isValid ? " is-valid" : "") + (isInvalid ? " is-invalid" : "")}
                />
                {nullable && (
                    <Button variant="outline-secondary" onClick={() => handleSelectItem(null)}>
                        <i className="fa-solid fa-eraser"></i>
                        <span className="visually-hidden">Effacer</span>
                    </Button>
                )}
            </InputGroup>
            {showDropdown && (
                <DropdownMenu show>
                    {status.isError && <DropdownItem>Erreur: {errors?.message ?? "erreur indéfinie"}</DropdownItem>}
                    {status.isLoading ? (
                        <DropdownItem>Chargement...</DropdownItem>
                    ) : (
                        searchResults && searchResults.length > 0 ? (
                            searchResults.map((item) => (
                                <DropdownItem key={item.id} onMouseDown={() => handleSelectItem(item)}>
                                    {children(item)}
                                </DropdownItem>
                            ))
                        ) : (
                            <DropdownItem>Aucun résultat</DropdownItem>
                        )
                    )}
                </DropdownMenu>
            )}
        </div>
    );
}
