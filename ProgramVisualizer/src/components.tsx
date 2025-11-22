import { GetRegisters } from "./api"
import React, {useEffect, useState, useRef} from 'react';

const Registers: React.FC = () => {
    const [registers, setRegisters] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        let cancelled = false;

        const fetchAndUpdate = async (isInitial = false) => 
        {
            try {
                if(isInitial) setLoading(true);
                const data = await GetRegisters(); // consider adding support for AbortSignal in api

                if (cancelled) return;

                if (Array.isArray(data)) 
                {
                    const normalized = data.map((v: any) => Number(v) & 0xff);

                    setRegisters(prev => 
                    {
                        if (!prev || prev.length !== normalized.length) return normalized;
                        for (let i = 0; i < prev.length; i++) if (prev[i] !== normalized[i]) return normalized;
                        return prev; // no change
                    });
                } 
            } 
            finally 
            {
                if (!cancelled && isInitial) setLoading(false);
            }
        };

        // initial fetch
        fetchAndUpdate();
    }, []);

    return (
        <div>
            {loading && <div className="loading-overlay">Register Values Unavailable</div>}

            <div className="register-grid" role="list">
                {registers.map((r, i) => (
                    <div key={i} className="register-box" role="listitem" aria-label={`Register ${i}`}>
                        <div className="r-label">R{i}</div>
                        <div className="r-value">{'0x' + (Number(r) & 0xff).toString(16).padStart(2, '0').toUpperCase()}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Registers;
