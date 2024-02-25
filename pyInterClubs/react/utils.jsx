export default function Collapsible({ }) {

    const [toggle, setToggle] = useState(false);
    const toggleFunc = React.useCallback(() => setToggle(!toggle));

    return (
        <div>
            <button onClick={toggleFunc}>Toggle Collapse</button>
            <ReactBootstrap.Collapse in={toggle}>
                <div>
                    Stuff to collapse
                </div>
            </ReactBootstrap.Collapse>
        </div>
    );
};