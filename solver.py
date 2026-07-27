import sys
import heapq

def get_heuristic(state, size, goal_pos):
    md = 0
    # Manhattan distance
    for i, val in enumerate(state):
        if val != 0:
            r, c = i // size, i % size
            tr, tc = goal_pos[val]
            md += abs(r - tr) + abs(c - tc)
            
    lc = 0
    # Row conflict
    for r in range(size):
        row_tiles = []
        for c in range(size):
            val = state[r * size + c]
            if val != 0 and goal_pos[val][0] == r:
                row_tiles.append(goal_pos[val][1])
        # count inversions
        for i in range(len(row_tiles)):
            for j in range(i + 1, len(row_tiles)):
                if row_tiles[i] > row_tiles[j]:
                    lc += 2
                    
    # Col conflict
    for c in range(size):
        col_tiles = []
        for r in range(size):
            val = state[r * size + c]
            if val != 0 and goal_pos[val][1] == c:
                col_tiles.append(goal_pos[val][0])
        # count inversions
        for i in range(len(col_tiles)):
            for j in range(i + 1, len(col_tiles)):
                if col_tiles[i] > col_tiles[j]:
                    lc += 2
                    
    return md + lc

def solve(start_state, size, goal_pos, goal_state, weight=1.5, max_states=40000):
    if start_state == goal_state:
        return []
        
    counter = 0
    h_start = get_heuristic(start_state, size, goal_pos)
    queue = [(h_start * weight, counter, 0, start_state, ())]
    visited = {start_state: 0}
    
    while queue:
        f, _, g, state, path = heapq.heappop(queue)
        
        if state == goal_state:
            return list(path)
            
        if len(visited) > max_states:
            return None
            
        if g > visited[state]:
            continue
            
        empty_idx = state.index(0)
        r, c = empty_idx // size, empty_idx % size
        
        neighbors = []
        if r > 0: neighbors.append(empty_idx - size)
        if r < size - 1: neighbors.append(empty_idx + size)
        if c > 0: neighbors.append(empty_idx - 1)
        if c < size - 1: neighbors.append(empty_idx + 1)
        
        for next_idx in neighbors:
            next_state_list = list(state)
            moved_tile = next_state_list[next_idx]
            next_state_list[empty_idx], next_state_list[next_idx] = next_state_list[next_idx], next_state_list[empty_idx]
            next_state = tuple(next_state_list)
            
            next_g = g + 1
            if next_state not in visited or next_g < visited[next_state]:
                visited[next_state] = next_g
                h = get_heuristic(next_state, size, goal_pos)
                counter += 1
                heapq.heappush(queue, (next_g + weight * h, counter, next_g, next_state, path + (moved_tile,)))
                
    return None

def get_solution(start_state):
    size = int(len(start_state) ** 0.5)
    goal_state = tuple(range(1, size * size)) + (0,)
    
    goal_pos = [None] * (size * size)
    for v in range(1, size * size):
        goal_pos[v] = ((v - 1) // size, (v - 1) % size)
        
    if size == 3:
        # 3x3 is small (8-puzzle), solve optimally (weight 1.0)
        return solve(start_state, size, goal_pos, goal_state, weight=1.0, max_states=100000)
    elif size == 4:
        # 4x4 (15-puzzle) - try weights sequentially
        sol = solve(start_state, size, goal_pos, goal_state, weight=1.5, max_states=40000)
        if sol is not None: return sol
        sol = solve(start_state, size, goal_pos, goal_state, weight=3.0, max_states=40000)
        if sol is not None: return sol
        return solve(start_state, size, goal_pos, goal_state, weight=5.0, max_states=40000)
    else:
        # 5x5 (24-puzzle) - solve extremely greedily (higher weight) to avoid long search or OOM
        sol = solve(start_state, size, goal_pos, goal_state, weight=5.0, max_states=15000)
        if sol is not None: return sol
        return solve(start_state, size, goal_pos, goal_state, weight=10.0, max_states=10000)

if __name__ == '__main__':
    # Parse inputs from CLI
    if len(sys.argv) < 2:
        print("Error: Please provide board values.")
        sys.exit(1)
        
    try:
        board = tuple(int(x) for x in sys.argv[1:])
        solution = get_solution(board)
        print(" ".join(str(tile) for tile in solution))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
