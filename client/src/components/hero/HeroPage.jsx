import { Link } from "react-router-dom";

export default function HeroPage() {
    return (
        <div>
            <h1>Anonymous Campus Chat</h1>
            <p>Talk to your batch, division, and university — anonymously.</p>
            <Link to="/login">Login</Link>||
            <Link to="/register">Register</Link>
        </div>
    );
}