const { useState, useEffect, useRef, useCallback } = React;
const { InputGroup, DropdownMenu, DropdownItem, Button } = ReactBootstrap;
import Observer from './observer.jsx';

const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

export default function Autocomplete({
    endpoint, children, value, onChange, key = 'id',
    nullable = true, minLength = 3, csrf,
    className, isValid, isInvalid, placeholder = "Rechercher...", size
}) {
    const [searchTerm, setSearchTerm] = useState('');       // Ce qui est affiché dans le input
    const [searchQuery, setSearchQuery] = useState('');     // Ce qui est recherché
    const [selectedItem, setSelectedItem] = useState(null); // L'élement sélectionné
    const [hasFocus, setHasFocus] = useState(false);
    const inputRef = useRef(null);
    const timeout = useRef(null);

    const handleInputChange = (event) => {
        handleSelectItem(null, event.target.value);
        updateSearchQuery(event.target.value, searchQuery);
    };

    // TODO : Gérer le debounce en interne de cette fonction de manière à le zapper quand le searchTerm n'est pas valide
    // (et supprimer direct le searchQuery de manière à ne pas afficher la liste durant 300ms)
    const updateSearchQuery = useCallback(
        (query, current) => {
            clearTimeout(timeout.current);
            if (query.length >= minLength) {
                timeout.current = setTimeout(() => setSearchQuery(query), 300);
            } else if (current != "") {
                setSearchQuery("");
            }
        },
        []
    );

    const handleSelectItem = (item, txt = '') => {
        setSearchTerm(item ? children(item) : txt);
        if (!item || !selectedItem || item[key] != selectedItem[key]) {
            setSelectedItem(item);
            if (onChange)
                onChange(item);
        }
    };

    return (
        <Observer endpoint={endpoint} csrf={csrf}>
            {({ data, errors, status, action }) => {
                useEffect(() => {
                    if (value && selectedItem && selectedItem[key] !== value[key]) {
                        action(typeof value === 'string' ? `?q=${value}` : `${value[key]}/`);
                    } else if (!value) {
                        handleSelectItem(null);
                    }
                }, [value]);

                useEffect(() => {
                    if (searchQuery)
                        action(typeof searchQuery === 'string' ? `?q=${searchQuery}` : `${searchQuery}/`);
                    else
                        data = [];
                }, [searchQuery]);

                useEffect(() => {
                    if (data && !Array.isArray(data))
                        handleSelectItem(data);
                }, [data]);

                const searchResults = status.isSuccess && !selectedItem ? data : [];
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
                                {status.isLoading && <DropdownItem>Chargement...</DropdownItem>}
                                {status.isError && <DropdownItem>Erreur: {errors.message}</DropdownItem>}
                                {searchResults && searchResults.length > 0 ? (
                                    searchResults.map((item) => (
                                        <DropdownItem key={item.id} onMouseDown={() => handleSelectItem(item)}>
                                            {children(item)}
                                        </DropdownItem>
                                    ))
                                ) : (
                                    <DropdownItem>Aucun résultat</DropdownItem>
                                )}
                            </DropdownMenu>
                        )}
                    </div>
                );
            }}
        </Observer>
    );
}
