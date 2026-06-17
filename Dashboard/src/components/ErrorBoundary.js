import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error) {
        console.error('Error caught by boundary:', error);
    }
    render() {
        if (this.state.hasError) {
            return (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 m-6", children: [_jsx("h2", { className: "text-lg font-semibold text-red-900 mb-2", children: "Something went wrong" }), _jsx("p", { className: "text-red-800 text-sm", children: this.state.error?.message ||
                            'An unexpected error occurred. Please refresh the page.' }), _jsx("button", { onClick: () => window.location.reload(), className: "mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition", children: "Refresh Page" })] }));
        }
        return this.props.children;
    }
}
