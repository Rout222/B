export interface IDoubleHistory {
    total_pages : number
    records : IDouble[]
}

export interface IDouble {
    id: string
    created_at: Date
    color: "black" | "red" | "white"
    roll: number
}