import { Module } from "@nestjs/common";
import { PostgresService } from "./postgres";

@Module({
    providers: [PostgresService],
    exports: [PostgresService],
})
export class DatabaseModule {}