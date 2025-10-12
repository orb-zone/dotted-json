// Type stub for optional surrealdb peer dependency
declare module 'surrealdb' {
  export default class Surreal {
    connect(url: string): Promise<void>;
    signin(credentials: any): Promise<void>;
    use(config: { namespace: string; database: string }): Promise<void>;
    select(id: any): Promise<any>;
    update(id: any, data: any): Promise<any>;
    merge(id: any, data: any): Promise<any>;
    delete(id: any): Promise<any>;
    query(sql: string, params?: any): Promise<any[]>;
    live(id: string, callback: (action: string, result: any) => void): Promise<string>;
    kill(queryId: string): Promise<void>;
    close(): Promise<void>;
  }
}
