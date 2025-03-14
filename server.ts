import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(handler);
    const io = new Server(httpServer, {
        cors: {
            origin: "*", // Allow any origin
        }
    });

    let user: { name: string, items: number[] }[] = []
    let attack: { username: string, action: string }[] = []

    io.on("connection", (socket) => {

        // on login
        socket.on("login", (name) => {
            if (user.length < 1) {
                user.push({
                    items: [0, 1, 2, 3, 4, 5, 6, 7],
                    name: name
                })
            } else {
                user.push({
                    items: [71, 70, 69, 68, 67, 66, 65, 64],
                    name: name
                })

            }
            io.emit("newUser", user.map((u) => u));
        });


        socket.on('action', ({ action, username }) => {
            attack.push({
                action: action,
                username: username
            })
            io.emit("newAction", { attack, attackBy: username });
        })


        socket.on('fight', (fight: {
            username: string;
            action: string;
        }[]) => {
            const rules = {
                Rock: "Scissors",
                Scissors: "Paper",
                Paper: "Rock"
            };


            const [player1, player2] = fight;

            if (player1.action === player2.action) {
                io.emit("win", "tie");
                attack = []
            } else {
                const win = rules[player1.action] === player2.action
                    ? player1.username
                    : player2.username;
                attack = []
                io.emit("win", win);
            }



        })


        socket.on("walk", (data: { id: number; username: string }) => {
            user = user.map((u) => {
                if (u.name === data.username) {
                    return {
                        ...u,
                        items: [data.id, ...u.items.slice(0, -1)] // Adds 5 to the front and removes the last item
                    };
                } else {
                    if (u.items[u.items.length - 1] === data.id) {
                        return {
                            ...u,
                            items: u.items.slice(0, -1)
                        }
                    }
                    return u;
                }
            });
            attack = []



            io.emit('userWalk', user)
        });


        socket.on("restart", () => {
            user = [];
            attack = [];
            io.emit("newUser", user);
        });


        socket.on("disconnect", () => {
            user = []
            attack = []
            console.log("Client disconnected:", socket.id);
        });


    });

    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
});
