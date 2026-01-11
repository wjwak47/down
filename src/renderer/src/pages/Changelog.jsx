import React from 'react';
import { FileText, Plus, Wrench, Bug } from 'lucide-react';
import { changelog } from '../data/changelog';

const Changelog = () => {
    const getIcon = (type) => {
        switch (type) {
            case 'added':
                return <Plus className="w-4 h-4" />;
            case 'improved':
                return <Wrench className="w-4 h-4" />;
            case 'fixed':
                return <Bug className="w-4 h-4" />;
            default:
                return <FileText className="w-4 h-4" />;
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'added':
                return 'text-green-600 bg-green-50';
            case 'improved':
                return 'text-blue-600 bg-blue-50';
            case 'fixed':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    const getLabel = (type) => {
        switch (type) {
            case 'added':
                return 'Added';
            case 'improved':
                return 'Improved';
            case 'fixed':
                return 'Fixed';
            default:
                return type;
        }
    };

    return (
        <div className="h-screen overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">📝 What's New</h1>
                    <p className="text-gray-600">Version history and update notes</p>
                </div>

                {/* Version List */}
                <div className="space-y-6">
                    {changelog.map((release, index) => (
                        <div
                            key={release.version}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                        >
                            {/* Version Header */}
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold">Version {release.version}</h2>
                                        <p className="text-blue-100 text-sm mt-1">{release.date}</p>
                                    </div>
                                    {index === 0 && (
                                        <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                                            Latest
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Changes */}
                            <div className="p-6 space-y-4">
                                {Object.entries(release.changes).map(([type, items]) => (
                                    <div key={type}>
                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium mb-3 ${getColor(type)}`}>
                                            {getIcon(type)}
                                            {getLabel(type)}
                                        </div>
                                        <ul className="space-y-2 ml-4">
                                            {items.map((item, i) => (
                                                <li key={i} className="flex items-start gap-2 text-gray-700">
                                                    <span className="text-gray-400 mt-1.5">•</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Thank you for using ProFlow Studio! 🚀</p>
                </div>
            </div>
        </div>
    );
};

export default Changelog;
