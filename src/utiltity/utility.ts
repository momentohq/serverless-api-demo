import axios from "axios";

export const maxTestUsersToMake = 100

export async function resolveFollowersNames(userPromises: Array<Promise<User| null>>): Promise<Array<string>> {
    const u = await Promise.all(userPromises)
    const rList: Array<string> = []
    u.forEach(ur => {
        if (ur == null){
            throw new Error(`no user found for follower`);
        }
        rList.push(ur.name)
    })
    return rList
}

export function genName(): string {
    const firstNames = [
        'excited', 'clingy', 'sad', 'happy', 'strange', 'scared', 'mystical', 'clingy',
        'obnoxious', 'rare', 'dumb', 'goofy', 'angry', 'spacey', 'lazy', 'relaxed',
    ]
    const lastNames = [
        'otter', 'wombat', 'zebra', 'elephant', 'squirrel', 'rabbit', 'frog',
        'rino', 'lion', 'sloth', 'hamster', 'dog', 'cat', 'fish',
    ]
    return `${
        capitalize(firstNames[getRandomInt(0, firstNames.length)])
    } ${
        capitalize(lastNames[getRandomInt(0, lastNames.length)])
    }`;
}

export function genFollowers(id: string): Array<string>{
    const returnList = [];
    const followerCount = 5
    for(let i = 0; i < followerCount; i ++){
        const followToAdd = `${getRandomInt(1, maxTestUsersToMake)}`
        if (followToAdd != id){
            returnList.push(`${getRandomInt(1, maxTestUsersToMake)}`)
        }
    }
    return returnList;
}

export async function genProfilePic(userId: number): Promise<string> {
    const gender = Math.random() < 0.5 ? 'women': 'men';
    let image = await axios.get(
        `https://randomuser.me/api/portraits/${gender}/${userId}.jpg`,
        {responseType: 'arraybuffer'}
    );
    return Buffer.from(image.data).toString('base64');
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min)) + min;
}
