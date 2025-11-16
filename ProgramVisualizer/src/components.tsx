import { GetRegisters } from "./api"
import React, {useEffect, useState} from 'react';

const Registers: React.FC = () => {
    const [registers, setRegisters] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const data = await GetRegisters();
                // Log raw response for debugging
                // Open DevTools Console to inspect this output
                console.debug('GetRegisters response:', data);

                if (cancelled) return;
               
                // normalize to numbers and ensure bytes
                const normalized = data.map((v: any) => Number(v) & 0xff);
                setRegisters(normalized);
                
            } catch (e: any) {
                console.error('Failed to fetch', e);
                setError(e?.message ?? String(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (loading) return <div>Loading registers...</div>;
    if (error) return <div style={{ color: 'blue' }}>Error: {error}</div>;

    return (
        <div>
            <ul>
                <div className="register-box-container">
                    <div className="register-grid" role="list">
                        {registers.map((r, i) => (
                            <div key={i} className="register-box" role="listitem" aria-label={`Register ${i}`}>
                                <div className="r-label">R{i}</div>
                                <div className="r-value">{'0x' + (Number(r) & 0xff).toString(16).padStart(2, '0').toUpperCase()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </ul>
        </div>
    );
};

export default Registers;
