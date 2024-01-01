#include <iostream>
#include <cstring>
#include <cstdlib>
#include <ctime>
#include <algorithm>
using namespace std;

const int w=10, h=10;
int a[w][h], t[w][h];
bool vis[w][h];

void dfs(int x, int y){
    if(x<0||x>=w||y<0||y>=h||vis[x][y]||t[x][y]==0)return;
    vis[x][y]=1;
    dfs(x-1, y);
    dfs(x+1, y);
    dfs(x, y-1);
    dfs(x, y+1);
}

int num_components(){
    memset(vis, 0, sizeof(vis));
    int cnt=0;
    for(int i=0;i<w;i++){
        for(int j=0;j<h;j++){
            if(!vis[i][j]&&t[i][j]==1){
                cnt++;
                dfs(i, j);
            }
        }
    }
    return cnt;
}

int main(){
    srand(time(0));
    freopen("gen4.txt", "w", stdout);
    for(int z=0;z<2000;z++){
        memset(a, 0, sizeof(a));
        for(int i=0;i<((w+h)/3);i++){
            int x1, y1, x2, y2;
            do{
                memcpy(t, a, sizeof(a));
                do{
                    x1=rand()%w, y1=rand()%h, x2=rand()%w, y2=rand()%h;
                }while(abs(x1-x2)+abs(y1-y2)<3||abs(x1-x2)>=(int)(0.8*w)||abs(y1-y2)>=(int)(0.8*h));
                if(x1>x2)swap(x1, x2);
                if(y1>y2)swap(y1, y2);
                for(int x=x1;x<=x2;x++){
                    for(int y=y1;y<=y2;y++){
                        t[x][y]=1;
                    }
                }
            }while(num_components()>1);
            memcpy(a, t, sizeof(t));
        }

        int ex, ey;
        do{
            ex=rand()%w, ey=rand()%h;
        }while(a[ex][ey]==0);
        a[ex][ey]=-1;

        for(int i=0;i<w;i++){
            for(int j=0;j<h;j++){
                cout<<a[i][j]<<' ';
            }
            cout<<'\n';
        }
        cout<<'\n';
    }
    
    return 0;
}