import { GetRegisters } from "./api";
import { GetHexRepresentation } from "./api";
import React, { useEffect, useState, useRef } from 'react';

const pollIntervalMs = 5000; // e.g., 5 seconds

const Registers: React.FC = () => {
    const [registers, setRegisters] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        let cancelled = false;

        const fetchAndUpdate = async (isInitial = false) => {
            try {
                if (isInitial) setLoading(true);

                const data = await GetRegisters();
                if (cancelled) return;

                if (Array.isArray(data)) {
                    const registerGridInfo = data.map((v: any) => Number(v) & 0xff);

                    setRegisters(prev => {
                        if (!prev || prev.length !== registerGridInfo.length) return registerGridInfo;

                        for (let i = 0; i < prev.length; i++) if (prev[i] !== registerGridInfo[i]) return registerGridInfo;

                        return prev;
                    });

                    setLoading(false);
                }
            }
            catch {
                setLoading(true);
            }
        };

        fetchAndUpdate(true);

        if (pollIntervalMs > 0) {
            pollingRef.current = setInterval(() => fetchAndUpdate(false), pollIntervalMs);
        }

        return () => {
            cancelled = true;
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, []);

    return (
        <div>
            {loading && <div className="loading-overlay" style={{ borderBottom: 'none' }}>Register Values Unavailable</div>}

            {
                !loading && <div className="register-grid" role="list">
                    {registers.map((r, i) => (
                        <div key={i} className="register-box" role="listitem" aria-label={`Register ${i}`}>
                            <div className="r-label">R{i}</div>
                            <div className="r-value">{'0x' + (Number(r) & 0xff).toString(16).padStart(2, '0').toUpperCase()}</div>
                        </div>
                    ))}
                </div>
            }
        </div>
    );
};

export { Registers };

const HexInstruction: React.FC = () => {
    const [hex, setHex] = useState<string>();
    const [loading, setLoading] = useState(true);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        let isCancelled = false;

        const fetchAndUpdate = async (isInitial = false) => {
            try {
                if (isInitial) setLoading(true);

                if (isCancelled) return;

                const data = await GetHexRepresentation();

                setHex(data);

                setLoading(false);
            }
            catch {
                setLoading(true);
            }
        }

        fetchAndUpdate(true);

        if (pollIntervalMs > 0) {
            pollingRef.current = setInterval(() => fetchAndUpdate(false), pollIntervalMs);
        }

        return () => {
            isCancelled = true;
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };

    }, []);

    return (
        <div>
            {loading && <div className="loading-overlay">Hex Representation Unavailable</div>}

            {!loading &&
                <div className="information-description-panel-format">
                    <h1 className="information-description-title-format">HEX REPRESENTATION: {hex}</h1>
                </div>
            }
        </div>
    );
}

export { HexInstruction };

interface UploadFileButtonProps {
    onFileLoad: (content: string[], name: string) => void;
}

const UploadFileButton: React.FC<UploadFileButtonProps> = ({ onFileLoad }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                const lines = content.split('\n');
                onFileLoad(lines, file.name);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div>
          <button className="upload-file-button" onClick={handleUploadClick}>
            UPLOAD FILE
          </button>
          <input 
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            style={{display: "none"}}
          />
        </div>
    );
}

export { UploadFileButton };