export const getString = (string: any, start: string, end: string, i: number) => {
    i++;
    var str = string.split(start);
    var str = str[i].split(end);
    return str[0];
};

export const secondsUntilEnd = (created: Date) : number  => {
    const now = new Date();
    return Math.max(15 - Math.abs(now.getTime() - created.getTime())/1000, 0);
}