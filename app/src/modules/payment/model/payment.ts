import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export default class Payment {
    @IsNotEmpty()
    @IsString()
    correlationId: string;
    @IsNotEmpty()
    @IsNumber()
    amount: number;
}