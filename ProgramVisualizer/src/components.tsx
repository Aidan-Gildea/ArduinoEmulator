import { GetRegisters } from "./api"
import React, {useEffect, useState} from 'react';

const Registers: React.FC = () => {
    const [registers, setRegisters] = useState<number[] | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const data = await GetRegisters();
                if (mounted) setRegisters(data);
            } catch (e) {
                console.error('Failed to fetch registers', e);
            }
        })();
        return () => { mounted = false; };
    }, []);

    if (!registers) {
        return <div>Loading registers...</div>;
    }

    return (
        <div>
            <h3>Registers</h3>
            <ul>
                {registers.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
        </div>
    );
};

export default Registers;
