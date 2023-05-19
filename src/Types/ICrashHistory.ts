export interface ICrashHistory {
    total_pages : number
    records : ICrash[]
}

export interface ICrash {
    id: string
    created_at: Date
    crash_point: string
}