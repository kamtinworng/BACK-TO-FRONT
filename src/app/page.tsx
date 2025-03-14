'use client'
import { useEffect, useState } from "react";
import { Box, Button, Flex, List, Paper, SimpleGrid, Stack, TextInput, Text } from "@mantine/core";
import { socket } from "./socket";
import { notifications } from "@mantine/notifications";
import { IconCircleDotFilled } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useRouter } from "next/navigation";

export default function Home() {
  const [username, setUsername] = useState("");
  const [turn, setTurn] = useState(false);
  const [users, setUsers] = useState<{ name: string, items: number[] }[]>([])
  const [con, setCon] = useState(false)
  const [attack, setAttack] = useState<{ username: string, action: string }[]>([])
  const router = useRouter();
  const noti = (attackBy: string) => {
    if (attackBy !== username) {
      notifications.show({
        title: attackBy,
        message: 'action!'
      })
    }
  }

  const notiWin = (win: string) => {
    if (win === 'tie') {
      setAttack([])
      setTurn(false)
      notifications.show({
        title: 'TIE',
        message: `เสมอ`,
        position: 'bottom-center',
        color: 'yellow'
      })

    } else if (win === username) {
      setTurn(true)
      notifications.show({
        title: win,
        message: `Notification at ${win} message`,
        position: 'bottom-center',
      })
    } else {
      setTurn(false)
      notifications.show({
        title: win,
        message: `Notification at ${win} message`,
        position: 'bottom-center',
      })
    }


  }


  useEffect(() => {
    const newUserHandle = (newUser: any) => {
      setUsers(newUser);
    }

    socket.on("newUser", newUserHandle)

    const newActionHandle = (data: {
      attack: {
        username: string;
        action: string;
      }[], attackBy: string
    }) => {
      noti(data.attackBy)
      setAttack(data.attack);
    }

    socket.on("newAction", newActionHandle)

    const winHandle = (win: string) => {
      notiWin(win)
    }

    socket.on("win", winHandle);


    const userWalk = (user: any) => {

      if (user?.find((s) => s.items.length === 0)) {
        modals.open({
          title: 'เราได้ผู้ชนะแล้ว !!!',
          children: (
            <>
              <Text c={'black'}>{user?.find((s) => s.items.length !== 0).name} is winner!!</Text>
              <Button c={'black'} fullWidth onClick={() => {
                setUsers([]);  // Reset users
                setAttack([]); // Reset attacks
                setTurn(false); // Reset turn state
                setCon(false); // Allow reconnection
                setUsername(""); // Clear username
                socket.emit("restart"); // Notify server to restart the game
                modals.closeAll()
              }} mt="md">
                restart
              </Button>
            </>
          ),
        });
      }
      setTurn(false)
      setAttack([])
      setUsers(user);
    }


    socket.on('userWalk', userWalk)

    return () => {
      socket.off("newAction", newActionHandle);
      socket.off("newUser", newUserHandle);
      socket.off("win", winHandle);
      socket.off("userWalk", userWalk);
    };

  }, [username])

  useEffect(() => {
    if (attack.length > 1) {
      socket.emit("fight", attack)
    }
  }, [attack])


  const login = (name: string) => {
    socket.emit("login", name)
    setCon(true)
  }

  const action = (action: string) => {
    socket.emit("action", { action: action, username: username })
  }


  const walk = (id: number, username: string) => {
    socket.emit("walk", { id, username })
  }

  return (
    <>
      <Stack my={'lg'}>
        <TextInput label="username" onChange={(e) => setUsername(e.currentTarget.value)} disabled={con}></TextInput>
        <Box hidden={con}>
          <Button onClick={() => login(username)} fullWidth disabled={username === ''} >SUBMIT</Button>
        </Box>
      </Stack>

      <List>
        {
          users.map((user, index) => {
            return <List.Item key={index}>{user.name}</List.Item>
          })
        }
      </List>

      <Box hidden={!con}>
        <SimpleGrid cols={8}>
          {Array(72).fill(0).map((_, index) => {
            const elementId = index.toString();
            const user = users.find((f) => f.name === username);
            const firstItem = user?.items[0];

            // ตำแหน่งที่ห้ามให้สีเหลืองทางขวา
            const restrictedRight = [7, 15, 23, 31, 39, 47, 55, 63, 71];
            // ตำแหน่งที่ห้ามให้สีเหลืองทางซ้าย
            const restrictedLeft = [0, 8, 16, 24, 32, 40, 48, 56];

            const isRestrictedRight = restrictedRight.includes(firstItem!);
            const isRestrictedLeft = restrictedLeft.includes(firstItem!);

            return (
              <Paper
                radius={'lg'}
                style={{ cursor: 'pointer' }}
                p={'xl'}
                withBorder
                key={elementId}
                id={elementId}
                onClick={() => {
                  if (users.find((f) => f.name !== username)?.items.find((f) => f === index)) {
                    console.log('can');
                    if (index === users.find((f) => f.name !== username)?.items[users.find((f) => f.name !== username)!.items.length - 1]) {
                      walk(index, username)
                    }
                  } else if (user?.items.find((f) => f === index)) {
                    console.log('can');
                  } else if (!turn) {
                    console.log('can');
                  } else {
                    walk(index, username)
                  }
                }}

                bg={
                  user?.items.includes(index) ? 'green' :
                    users.some((f) => f.name !== username && f.items.includes(index)) ? 'red' :
                      turn ? (
                        firstItem! - 8 === index ||
                        firstItem! + 8 === index ||
                        (!isRestrictedRight && firstItem! + 1 === index) ||
                        (!isRestrictedLeft && firstItem! - 1 === index)
                      ) ? 'yellow' : (isRestrictedLeft && restrictedRight.includes(index)) ? 'white'
                        : 'white' : 'white'
                }
              >
                {
                  index == user?.items[0] ?
                    <IconCircleDotFilled />
                    : index == users.find((f) => f.name !== username)?.items[0] ?
                      <IconCircleDotFilled />
                      : ''
                }
                {index}
              </Paper>
            );
          })}
        </SimpleGrid>




      </Box >
      <Flex justify={'center'} gap={'lg'} my={'xl'}>
        <Button variant="light" onClick={() => action('Rock')}
          disabled={attack.find((f) => f.username === username)?.action ? true : false}
        >Rock</Button>
        <Button variant="light" onClick={() => action('Paper')}
          disabled={attack.find((f) => f.username === username)?.action ? true : false}
        >Paper</Button>
        <Button variant="light" onClick={() => action('Scissors')}
          disabled={attack.find((f) => f.username === username)?.action ? true : false}
        >Scissors</Button>
      </Flex>
    </>
  );
}


