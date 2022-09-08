// Models --
interface User {
    id: string,
    name: string,
    followers: Array<string>,
    profile_pic?: string
}