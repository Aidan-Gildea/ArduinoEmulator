import { GetRegisters } from "./api"
import React, {useEffect, useState, useRef} from 'react';

const Registers: React.FC = () => {
    const [registers, setRegisters] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Polling interval (ms). Set to 0 to disable polling.
    const pollIntervalMs = 5000; // adjust as needed
    const pollingRef = useRef<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        const ac = new AbortController();

        const fetchAndUpdate = async () => {
            try {
                setLoading(true);
                const data = await GetRegisters(); // consider adding support for AbortSignal in api
                console.debug('GetRegisters response:', data);
                if (cancelled) return;
                if (Array.isArray(data)) {
                    const normalized = data.map((v: any) => Number(v) & 0xff);
                    // optional: shallow compare and only set when different
                    setRegisters(prev => {
                        if (!prev || prev.length !== normalized.length) return normalized;
                        for (let i = 0; i < prev.length; i++) if (prev[i] !== normalized[i]) return normalized;
                        return prev; // no change
                    });
                } else {
                    setError('API returned unexpected payload (not an array)');
                }
            } catch (e: any) {
                if (e.name === 'AbortError') return; // ignore abort
                console.error('Failed to fetch', e);
                setError(e?.message ?? String(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        // initial fetch
        fetchAndUpdate();

        // setup polling
        if (pollIntervalMs > 0) {
            pollingRef.current = window.setInterval(fetchAndUpdate, pollIntervalMs) as unknown as number;
        }

        return () => {
            cancelled = true;
            ac.abort();
            if (pollingRef.current) {
                clearInterval(pollingRef.current as unknown as number);
                pollingRef.current = null;
            }
        };
    }, []);

    if (loading) return <div>Loading registers...</div>;
    if (error) return 
    (
        <div style={{ color: 'blue' }}>Error: {error}</div>
    );

    return (
        <div>
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
