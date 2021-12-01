namespace sprites {

    const maxGridSize = 256;



    //% block="set $sprite to track $targetSprite at speed $speed"
    //% group="Pathfinding"
    //% weight=100
    export function spriteTrackTargetSprite(sprite: Sprite, targetSprite: Sprite, speed: number) {

        // do 250 for now, if needed we can generify
        game.onUpdateInterval(250, () => {
            const obstacleMap = createObstacleMap();

            // was x & y
            const followSpriteTileX = sprite.left >> 4;
            const followSpriteTileY = sprite.top >> 4;

            console.log(`follow sprite x: ${followSpriteTileX}`)
            console.log(`follow sprite y: ${followSpriteTileY}`)

            const targetSpriteX = targetSprite.left >> 4;
            const targetSpriteY = targetSprite.top >> 4;

            if (followSpriteTileX === targetSpriteX
                && followSpriteTileY === targetSpriteY)
                return

            // let's a* this 💩
            const path = aStar(
                createGrid(obstacleMap),
                {
                    x: followSpriteTileX,
                    y: followSpriteTileY
                },
                {
                    x: targetSpriteX,
                    y: targetSpriteY
                });

            // no path to target, freeze follower and return
            if (path.length == 0) {
                console.log('no path found to target')
                sprite.vx = 0;
                sprite.vy = 0;
                sprite.ax = 0;
                sprite.ay = 0;
                return;
            }

            // we will either be going north, south, east, or west
            // fortunately the math for that is easy
            const nextTile = path[0];
            sprite.vx = (nextTile.x - followSpriteTileX) * speed;
            sprite.vy = (nextTile.y - followSpriteTileY) * speed;

            // console.log(sprite)

            if (path.length > 0) {
                const nextTileString = `travel to ${path[0].x}, ${path[0].y}`
                console.log(nextTileString)
            }

        })
    }

    function createObstacleMap() {
        const tilemap = game.currentScene().tileMap;

        const tileWidthCount = tilemap.areaWidth() >> 4;
        const tileHeightCount = tilemap.areaHeight() >> 4;

        const obstacleArray: boolean[][] = []
        for (let i = 0; i < tileWidthCount; i++) {
            let innerObstacleArray = []
            for (let j = 0; j < tileHeightCount; j++)
                innerObstacleArray.push(tilemap.isObstacle(i, j))
            obstacleArray.push(innerObstacleArray)
        }

        return obstacleArray;
    }

    type Node = {
        f: number,
        g: number,
        h: number,
        visited: boolean,
        wall: boolean,
        closed: boolean,
        parent: Node | null
    } & Coordinate

    type Coordinate = {
        x: number,
        y: number
    }

    type Grid = Node[][]

    function createGrid(obstacleMap: boolean[][]): Node[][] {
        const grid: Node[][] = []
        for (let i = 0; i < obstacleMap.length; i++) {
            const gridList: Node[] = []
            for (let j = 0; j < obstacleMap[i].length; j++) {
                gridList.push({
                    x: i,
                    y: j,
                    f: 0,
                    g: 0,
                    h: 0,
                    visited: false,
                    closed: false,
                    parent: null,
                    wall: obstacleMap[i][j]
                })
            }
            grid.push(gridList)
        }
        return grid
    }

    function aStar(grid: Node[][], start: Coordinate, target: Coordinate) {

        const openList: Node[] = []

        openList.push(grid[start.x][start.y])

        while (openList.length > 0) {
            let lowIndex = 0;
            for (let i = 1; i < openList.length; i++)
                if (openList[i].f < openList[lowIndex].f)
                    lowIndex = i;
            const currentNode = openList[lowIndex]

            // if we're at the target, reverse the list
            if (currentNode.x == target.x && currentNode.y == target.y) {
                let current = currentNode;
                const returnList = []
                while (current.parent != null) {
                    returnList.push(current)
                    current = current.parent
                }
                returnList.reverse()
                return returnList;
            }

            // move this element to closed
            openList.removeElement(currentNode)
            currentNode.closed = true;

            let neighbors = getNeighbors(grid, currentNode)

            for (const neighbor of neighbors) {
                if (neighbor.closed || neighbor.wall)
                    continue

                const gScore = currentNode.g + 1 // cost of 1 to get to an element
                let gScoreIsBest = false;

                if (!neighbor.visited) {

                    gScoreIsBest = true;
                    neighbor.h = manhattanDistance(neighbor, target)
                    neighbor.visited = true;
                    openList.push(neighbor);
                }
                else if (gScore < neighbor.g) {
                    gScoreIsBest = true;
                }
                if (gScoreIsBest) {
                    neighbor.parent = currentNode;
                    neighbor.g = gScore;
                    neighbor.f = neighbor.g + neighbor.h;
                }
            }
        }

        return [];

    }

    function getNeighbors(grid: Grid, element: Coordinate): Node[] {
        const list: Node[] = []
        const x = element.x;
        const y = element.y;

        if (grid[x - 1] && grid[x - 1][y])
            list.push(grid[x - 1][y])
        if (grid[x + 1] && grid[x + 1][y])
            list.push(grid[x + 1][y])
        if (grid[x] && grid[x][y - 1])
            list.push(grid[x][y - 1])
        if (grid[x] && grid[x][y + 1])
            list.push(grid[x][y + 1])

        return list;
    }

    function manhattanDistance(current: Coordinate, target: Coordinate): number {
        return Math.abs(target.x - current.x) + Math.abs(target.y - current.y);
    }

}
