import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./PageLayout.css";

interface PageHeadingProps {
    title: string;
    description?: string;
    eyebrow?: string;
    backTo?: string;
    backLabel?: string;
    action?: ReactNode;
}

/** Shared, low-noise heading for the pages around the poker room. */
export const PageHeading = ({ title, description, eyebrow = "TEXAS HODL", backTo = "/", backLabel = "Lobby", action }: PageHeadingProps) => (
    <header className="page-heading">
        <div className="page-heading-trail">
            <Link to={backTo}>← {backLabel}</Link>
            <span aria-hidden="true">/</span>
            <span>{eyebrow}</span>
        </div>
        <div className="page-heading-row">
            <div>
                <h1>
                    {title}
                    <span className="page-heading-dot">.</span>
                </h1>
                {description && <p>{description}</p>}
            </div>
            {action && <div className="page-heading-action">{action}</div>}
        </div>
    </header>
);
