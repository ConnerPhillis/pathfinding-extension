namespace sprites {

    const maxGridSize = 256;

    //% block="set $sprite to track $targetSprite at speed $speed"
    //% group="Pathfinding"
    //% weight=100
    export function spriteTrackTargetSprite(sprite: Sprite, targetSprite: Sprite, speed: number) {

        const scale = 4;

        // do 250 for now, if needed we can generify
        game.onUpdateInterval(100, () => {
            const obstacleMap = createObstacleMap();

            /*
            * this is going to get difficult - so we have to figure out if 
            * the sprite that we currently have chasing is going to slightly
            * collide with a wall that may or may not be rendered 
            * 
            * we have to position the target sprite at the exact center of a tile
            * to make sure that we're good.. that is going to be... difficult to
            * say the least.
            * 
            * Formula should be pretty easy
            * (left + right) / 2 = center x
            * (top + bottom) / 2 = center y
            * ((center x) >> 4) + 8 = midpoint of a tile to track to
            */

            const followSpriteTileX = ((sprite.left + sprite.right) / 2) >> scale
            const followSpriteTileY = ((sprite.top + sprite.bottom) / 2) >> scale

            console.log('FollowX: ' + followSpriteTileX)
            console.log('FollowY: ' + followSpriteTileY)

            // was x & y
            // const followSpriteTileX = sprite.left >> 4;
            // const followSpriteTileY = sprite.top >> 4;

            const targetSpriteX = ((targetSprite.left + targetSprite.right) / 2) >> scale
            const targetSpriteY = ((targetSprite.top + targetSprite.bottom) / 2) >> scale

            console.log('targetX: ' + targetSpriteX)
            console.log('targetY: ' + targetSpriteY)


            // const targetSpriteX = targetSprite.left >> 4;
            // const targetSpriteY = targetSprite.top >> 4;

            if (followSpriteTileX === targetSpriteX
                && followSpriteTileY === targetSpriteY)
                return

            // let's AStar this 💩
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

            console.log('intentions set to x: ' + sprite.vx + ' y: ' + sprite.vy)

            /*
             * now comes the hard part - we need to figure out if we're about to hit a wall
             * depending on what direction we're going and apply accelleration accordingly.
             */

            const correctionSpeed = speed / 4

            console.log('sprite coordinates, top: ' + sprite.top + ' bottom: ' + sprite.bottom + ' left ' + sprite.left + ' right: ' + sprite.right)
            
            // if intention is north
            if (sprite.vy < 0) {
                // and we're partially in the left tile
                if (sprite.left >> scale < followSpriteTileX
                    && isObstacleAtDirection({ x: sprite.left >> scale, y: followSpriteTileY }, Direction.North)) {
                    console.log('set avoidance x to positive #1')
                    sprite.vx = correctionSpeed
                }
                // and we're partially in the right tile
                if (sprite.right >> scale > followSpriteTileX
                    && isObstacleAtDirection({ x: sprite.right >> scale, y: followSpriteTileY }, Direction.North))
                    sprite.vx = -correctionSpeed
            }

            // if intention is south
            else if (sprite.vy > 0) {
                // and we're partially in the left tile
                if (sprite.left >> scale < followSpriteTileX 
                    && isObstacleAtDirection({x: sprite.left >> scale, y: followSpriteTileY}, Direction.South)) {
                    console.log('set avoidance x to positive #2')
                    sprite.vx = correctionSpeed
                }
                    
                // and we're partially in the right tile
                if (sprite.right >> scale > followSpriteTileX
                    && isObstacleAtDirection({x: sprite.right >> scale, y: followSpriteTileY}, Direction.South))
                    sprite.vx = -correctionSpeed
            }

            // if intention is east
            else if (sprite.vx > 0) {
                // and we're partially in the top tile
                if (sprite.top >> scale < followSpriteTileY
                    && isObstacleAtDirection({x: followSpriteTileX, y: sprite.top >> scale}, Direction.East))
                    sprite.vy = correctionSpeed
                // and we're partially in the bottom tile
                console.log('calcd: ' + (sprite.bottom >> scale))
                console.log('stored: ' + followSpriteTileY)
                if (sprite.bottom >> scale > followSpriteTileY
                    && isObstacleAtDirection({x: followSpriteTileX, y: sprite.bottom >> scale}, Direction.East))
                    sprite.vy = -correctionSpeed
            }

            // if intention is west
            else if (sprite.vx < 0) {
                // and we're partially in the top tile
                if (sprite.top >> scale < followSpriteTileY
                    && isObstacleAtDirection({ x: followSpriteTileX, y: sprite.top >> scale }, Direction.West))
                    sprite.vy = correctionSpeed
                // and we're partially in the bottom tile
                if (sprite.bottom >> scale > followSpriteTileY
                    && isObstacleAtDirection({ x: followSpriteTileX, y: sprite.bottom >> scale }, Direction.West))
                    sprite.vy = -correctionSpeed
            }

            console.log('final intentions set to x: ' + sprite.vx + ' y: ' + sprite.vy)

            
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

    enum Direction {
        North = 0,
        South = 1,
        East = 2,
        West = 3
    }

    function isObstacleAtDirection(coordinate: Coordinate, direction: Direction): boolean {
        const scene = game.currentScene()
        if (!scene.tileMap)
            return false
        const tileMap = scene.tileMap
        const { x, y } = coordinate
        switch (direction) {
            case Direction.North:
                return tileMap.isObstacle(x, y - 1)
            case Direction.South:
                return tileMap.isObstacle(x, y + 1)
            case Direction.East:
                return tileMap.isObstacle(x + 1, y)
            case Direction.West:
                return tileMap.isObstacle(x - 1, y)
            default:
                return false
        }
        
    }

}
