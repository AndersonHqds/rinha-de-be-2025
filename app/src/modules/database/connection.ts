export default abstract class Connection {
    abstract query (sql: string, params?: any[]): Promise<any[]>;
}