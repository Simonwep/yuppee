import {MigratableState, Migration} from './types';

export interface MigratorOptions<
    EAll extends MigratableState,
    EFirst = EAll & {version: 1}
> {
    migrations?: Migration<any, any>[];
    init(): Omit<EFirst, 'version'>;
}

/**
 * Takes an array of migration functions and returns a function to migrate an
 * old version of your state to the newest one.
 * @param options Migration configuration.
 */
export const createMigrator = <
    TLatest extends MigratableState,
    EAll extends MigratableState = TLatest,
>({migrations, init}: MigratorOptions<EAll>) => {
    const highestVersion = migrations ? Math.max(...migrations.map((v) => v.to)) : undefined;

    return (data: EAll | TLatest = {...init(), version: 1} as EAll): TLatest => {
        const sourceVersion = data.version;
        const targetVersion = highestVersion ?? sourceVersion;

        if (typeof sourceVersion !== 'number') {
            throw new Error(`Expected object with version number but version was ${sourceVersion}`)
        } else if (sourceVersion > targetVersion) {
            throw new Error(`Cannot process state with version ${sourceVersion}, highest known version is ${targetVersion}`);
        } else if (sourceVersion === targetVersion) {
            return {...data as TLatest, version: targetVersion};
        }

        let result: any = data;
        for (let i = sourceVersion; i < targetVersion;) {
            const fn = migrations
                ?.filter((m) => m.from === i && m.to > i)
                .sort((a, b) => a.to > b.to ? -1 : 1)
                .at(0);

            if (fn) {
                result = {...fn.migrate(result), version: fn.to};
                i = fn.to;
            } else {
                throw new Error(`Migration from v${i} to v${i + 1} missing`);
            }
        }

        return result;
    };
};
