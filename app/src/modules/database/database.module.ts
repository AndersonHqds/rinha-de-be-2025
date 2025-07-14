import { Module } from "@nestjs/common";
import { PostgresAdapter } from "./postgres";
import Connection from "./connection";

@Module({
    providers: [ {
        provide: Connection,
        useClass: PostgresAdapter,
    }],
    exports: [Connection],
})
export class DatabaseModule {}