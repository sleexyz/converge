import initCozoDb, { CozoDb } from 'cozo-lib-wasm';
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';

export class CozoDbService {
    db?: CozoDb;
    constructor(readonly setReady: (ready: boolean) => void) {
    }

    async init() {
        await initCozoDb();
        this.db = CozoDb.new();
        this.setReady(true);
        (window as any).db = this.db;
    }
}

export function CozoDbProvider(props: {children: React.ReactNode}) {
    const [ready, setReady] = useState(false);
    const cozoDbService = useMemo(() => new CozoDbService(setReady), []);

    useEffect(() => {
        cozoDbService.init().then(() => setReady(true));
    }, [cozoDbService]);

    const value = ready ? cozoDbService : null;
    return (
        <CozoDbServiceContext.Provider value={value}>
            {props.children}
        </CozoDbServiceContext.Provider>
    )
}

const CozoDbServiceContext = React.createContext<CozoDbService | null>(null);
