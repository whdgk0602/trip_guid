const MOCK_COURSE = {
  title: "강남역 골목 산책",
  intro: "퇴근길에 만나는 조용한 골목과 따뜻한 한 끼, 그리고 잠깐의 쉼표 같은 공원까지.",
  spots: [
    {
      id: "spot-1",
      name: "대림 커피",
      category: "카페",
      description: "출근길에 들르기 좋은 조용한 동네 카페.",
      address: "서울 영등포구 대림동",
    },
    {
      id: "spot-2",
      name: "골목 식당",
      category: "식당",
      description: "퇴근길 허기를 달래주는 오래된 백반집.",
      address: "서울 강남구 역삼동",
    },
    {
      id: "spot-3",
      name: "역삼 작은 공원",
      category: "공원",
      description: "잠깐 앉아 쉬어가기 좋은 동네 쉼터.",
      address: "서울 강남구 역삼동",
    },
  ],
};

export async function POST(request: Request) {
  await request.json();
  const delayMs = 1500 + Math.random() * 500;
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  return Response.json(MOCK_COURSE);
}
