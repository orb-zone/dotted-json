// Type stub for optional surrealdb peer dependency
 
declare module 'surrealdb' {
   
  export default class Surreal {
    connect(url: string): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signin(credentials: any): Promise<void>;
    use(config: { namespace: string; database: string }): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select(id: any): Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update(id: any, data: any): Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    merge(id: any, data: any): Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete(id: any): Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query(sql: string, params?: any): Promise<any[]>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    live(id: string, callback: (action: string, result: any) => void): Promise<string>;
    kill(queryId: string): Promise<void>;
    close(): Promise<void>;
  }
}
