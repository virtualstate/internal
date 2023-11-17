import ReactDOM from "react-dom/client";

function Home() {
    return (
        <div>
            Page loaded at {new Date().toISOString()}
        </div>
    )
}

export async function home() {

    console.log("Hello from home!");

    const element = document.getElementById("react-home");
    if (!element) return;
    const root = ReactDOM.createRoot(element);
    root.render(<Home />);

}