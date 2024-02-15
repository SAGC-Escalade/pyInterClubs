class HelloWorld extends React.Component {
    render() {
        return (<h1>My First ReactJS Core App!</h1>);
    }
}

const root = ReactDOM.createRoot(document.getElementById("react_0HMVLSNB1HPRE"));
root.render(<HelloWorld />);
//ReactDOM.hydrate(React.createElement(HelloWorld, {}), document.getElementById("react_0HMVLSNB1HPRE"));
