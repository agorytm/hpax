interface Props {
  count: number  // messages déjà postés (0–100)
}

export default function Counter({ count }: Props) {
  return (
    <div className="flex flex-col items-center mb-10 leading-none">
      <div
        className="font-serif font-bold text-white"
        style={{ fontSize: '124px', letterSpacing: '-5px', lineHeight: 1 }}
      >
        {count}
      </div>
      <div className="w-24 h-px bg-[#444] my-1" />
      <div
        className="font-serif text-[#555]"
        style={{ fontSize: '30px', letterSpacing: '-1px' }}
      >
        100
      </div>
    </div>
  )
}
