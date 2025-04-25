import styled from "styled-components";

interface DoronImageProps {
  url: string;
  name: string;
}

const StyledImage = styled.img`
  max-width: 100vw;
  max-height: 100vh;
  object-fit: contain;
  width: auto;
  height: auto;
`

export const DoronImage: React.FC<DoronImageProps> = ({ url, name }) => {
  return (
    <div>
      <StyledImage src={url} alt={name} loading="lazy" />
    </div>
  )
}
