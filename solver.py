import sys
import heapq

# Target positions for tiles 1-15 (0 is empty space)
GOAL_POS = [None] * 16
for v in range(1, 16):
    GOAL_POS[v] = ((v - 1) // 4, (v - 1) % 4)

def get_heuristic(state):
    md = 0
    # Manhattan distance
    for i, val in enumerate(state):
        if val != 0:
            r, c = i // 4, i % 4
            tr, tc = GOAL_POS[val]
            md += abs(r - tr) + abs(c - tc)
            
    lc = 0
    # Row conflict
    for r in range(4):
        row_tiles = []
        for c in range(4):
            val = state[r * 4 + c]
            if val != 0 and GOAL_POS[val][0] == r:
                row_tiles.append(GOAL_POS[val][1]) # list of goal columns in current order
        # count inversions
        for i in range(len(row_tiles)):
            for j in range(i + 1, len(row_tiles)):
                if row_tiles[i] > row_tiles[j]:
                    lc += 2
                    
    # Col conflict
    for c in range(4):
        col_tiles = []
        for r in range(4):
            val = state[r * 4 + c]
            if val != 0 and GOAL_POS[val][1] == c:
                col_tiles.append(GOAL_POS[val][0]) # list of goal rows in current order
        # count inversions
        for i in range(len(col_tiles)):
            for j in range(i + 1, len(col_tiles)):
                if col_tiles[i] > col_tiles[j]:
                    lc += 2
                    
    return md + lc

def solve(start_state, weight=1.5):
    goal_state = tuple(range(1, 16)) + (0,)
    if start_state == goal_state:
        return []
        
    counter = 0
    h_start = get_heuristic(start_state)
    queue = [(h_start * weight, counter, 0, start_state, ())]
    visited = {start_state: 0}
    
    max_states = 40000 # Limit visited states to avoid slow search/OOM on weight 1.5
    
    while queue:
        f, _, g, state, path = heapq.heappop(queue)
        
        if state == goal_state:
            return list(path)
            
        if len(visited) > max_states:
            return None
            
        if g > visited[state]:
            continue
            
        empty_idx = state.index(0)
        r, c = empty_idx // 4, empty_idx % 4
        
        neighbors = []
        if r > 0: neighbors.append(empty_idx - 4) # Up
        if r < 3: neighbors.append(empty_idx + 4) # Down
        if c > 0: neighbors.append(empty_idx - 1) # Left
        if c < 3: neighbors.append(empty_idx + 1) # Right
        
        for next_idx in neighbors:
            next_state_list = list(state)
            moved_tile = next_state_list[next_idx]
            # Swap empty space (0) with the tile
            next_state_list[empty_idx], next_state_list[next_idx] = next_state_list[next_idx], next_state_list[empty_idx]
            next_state = tuple(next_state_list)
            
            next_g = g + 1
            if next_state not in visited or next_g < visited[next_state]:
                visited[next_state] = next_g
                h = get_heuristic(next_state)
                counter += 1
                heapq.heappush(queue, (next_g + weight * h, counter, next_g, next_state, path + (moved_tile,)))
                
    return None

def get_solution(start_state):
    # Try near-optimal search (weight=1.5)
    sol = solve(start_state, weight=1.5)
    if sol is not None:
        return sol
        
    # Try faster search (weight=3.0)
    sol = solve(start_state, weight=3.0)
    if sol is not None:
        return sol
        
    # Try extremely greedy search (weight=5.0) which is almost instant
    sol = solve(start_state, weight=5.0)
    if sol is not None:
        return sol
        
    return []

if __name__ == '__main__':
    if len(sys.argv) < 17:
        print("Error: Please provide 16 board values.")
        sys.exit(1)
        
    try:
        board = tuple(int(x) for x in sys.argv[1:17])
        solution = get_solution(board)
        # Output space-separated tile numbers
        print(" ".join(str(tile) for tile in solution))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
