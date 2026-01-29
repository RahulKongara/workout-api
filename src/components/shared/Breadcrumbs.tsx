'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
    return (
        <nav
            aria-label="Breadcrumb"
            className={`flex items-center text-sm text-gray-500 ${className}`}
        >
            <ol className="flex items-center gap-1 flex-wrap">
                <li className="flex items-center">
                    <Link
                        href="/"
                        className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        <span className="sr-only">Home</span>
                    </Link>
                </li>

                {items.map((item, index) => (
                    <li key={index} className="flex items-center">
                        <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
                        {item.href && index !== items.length - 1 ? (
                            <Link
                                href={item.href}
                                className="hover:text-gray-900 transition-colors"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-gray-900 font-medium">
                                {item.label}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
