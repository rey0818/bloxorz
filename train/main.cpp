#include <iostream>
#include <cstring>
#include <queue>
#include <array>
using namespace std;
const int mxW=30, mxH=30, mxN=5;
int W, H, N;
int map[mxW][mxH];

bool states[1<<mxN][mxW][mxH][3];//0:stand, 1:down, 2:right
char graph[1<<mxN][mxW][mxH][3][5];//0:up, 1:down, 2:left, 3:right, 4:change
bool vis[1<<mxN][mxW][mxH][3];

const int deltaX[3][4][3] = {
    {{-2, 0, 1}, {1, 0, 1}, {0, -2, 2}, {0, 1, 2}},
    {{-1, 0, 0}, {2, 0, 0}, {0, -1, 1}, {0, 1, 1}},
    {{-1, 0, 2}, {1, 0, 2}, {0, -1, 0}, {0, 2, 0}}
};

bool bound(int x, int y) {
    return x >= 0 && x < W && y >= 0 && y < H;
}

bool isblock(int id, int b) {
    return id != 0 && (id<=1||(b&(1<<(id-2))));
}

array<int, 4> move(array<int, 4> p, int dir){
    array<int, 4> ret = {p[0], p[1]+deltaX[p[3]][dir][0], p[2]+deltaX[p[3]][dir][1], deltaX[p[3]][dir][2]};
    if(bound(ret[1], ret[2])) ret[0] += (int)graph[ret[0]][ret[1]][ret[2]][ret[3]][4];
    return ret;
}

int bfs(int stt, int x, int y) {
    queue<array<int, 5>> q;
    q.push({stt, x, y, 0, 0});
    while(!q.empty()){
        array<int, 5> cur = q.front();
        q.pop();
        if(!bound(cur[1], cur[2]) || !states[cur[0]][cur[1]][cur[2]][cur[3]]) continue;
        if (vis[cur[0]][cur[1]][cur[2]][cur[3]]) continue;
        if (map[cur[1]][cur[2]]==-1 && cur[3] == 0) return cur[4];
        vis[cur[0]][cur[1]][cur[2]][cur[3]] = 1;
        //cout<<cur[0]<<" "<<cur[1]<<" "<<cur[2]<<" "<<cur[3]<<" "<<cur[4]<<endl;
        for (int i = 0; i < 4; i++){
            if (graph[cur[0]][cur[1]][cur[2]][cur[3]][i]){
                array<int, 4> next = move({cur[0], cur[1], cur[2], cur[3]}, i);
                q.push({next[0], next[1], next[2], next[3], cur[4]+1});
            }
        }
    }
    return -1;
}

int main() {
    memset(states, 0, sizeof(states));
    memset(vis, 0, sizeof(vis));
    memset(graph, 0, sizeof(graph));

	cin>>W>>H>>N;
	if(W>mxW||H>mxH||N>mxN) return -1;
	for(int i=0;i<W;i++){
		for(int j=0;j<H;j++){
			cin>>map[i][j];
		}
	}
	int sx, sy, ex, ey, stt=0;
	cin>>sx>>sy>>ex>>ey;
	sx--;sy--;ex--;ey--;
	map[ex][ey] = -1;
	for(int i=0;i<N;i++){
		int x;
		cin>>x;
		stt+=x*(1<<i);
	}

    for(int b=0;b<(1<<N);b++){
        for(int i=0; i<W; i++) {
            for(int j=0; j<H; j++) {
                if (isblock(map[i][j], b)) states[b][i][j][0] = 1;
                if (isblock(map[i][j], b) && isblock(map[i+1][j], b)) states[b][i][j][1] = 1;
                if (isblock(map[i][j], b) && isblock(map[i][j+1], b)) states[b][i][j][2] = 1;
            }
        }
    }
    for(int b=0;b<(1<<N);b++){
        for (int i = 0; i < W; i++){
            for (int j = 0; j < H; j++){
                if(states[b][i][j][0] && map[i][j]<=-2) graph[b][i][j][0][4] += (b^(1<<(-map[i][j]-2))) - b;
                if(states[b][i][j][1]){
                    if(map[i][j]<=-2) graph[b][i][j][1][4] += (b^(1<<(-map[i][j]-2))) - b;
                    if(map[i+1][j]<=-2) graph[b][i][j][1][4] += (b^(1<<(-map[i+1][j]-2))) - b;
                }
                if(states[b][i][j][2]){
                    if(map[i][j]<=-2) graph[b][i][j][2][4] += (b^(1<<(-map[i][j]-2))) - b;
                    if(map[i][j+1]<=-2) graph[b][i][j][2][4] += (b^(1<<(-map[i][j+1]-2))) - b;
                }
            }
        }
    }
    for(int b=0;b<(1<<N);b++){
        for (int i = 0; i < W; i++){
            for (int j = 0; j < H; j++){
                for (int k = 0; k < 3; k++){
                    if (!states[b][i][j][k]) continue;
                    for (int l = 0; l < 4; l++){
                        array<int, 4> next = move({b, i, j, k}, l);
                        if (bound(next[1], next[2]) && states[next[0]][next[1]][next[2]][next[3]]){
                            graph[b][i][j][k][l] = 1;
                        }
                    }
                }
            }
        }
    }
    cout<<bfs(stt, sx, sy);

    return 0;
}