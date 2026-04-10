# 🗺️ UrbanMap — Fiscalize sua Cidade

Uma plataforma cidadã para **documentar e reportar problemas de acessibilidade e infraestrutura urbana** diretamente do celular, com foto e localização GPS.

🔗 **Acesse agora:** [oguiaq.github.io/urban-map](https://oguiaq.github.io/urban-map/)

---

## O que é o UrbanMap?

O UrbanMap permite que qualquer cidadão registre ocorrências como buracos, desníveis, falta de iluminação, rampas danificadas, obstruções e áreas de inundação — sem precisar de cadastro.

Ao final de cada mês, todas as ocorrências aprovadas são compiladas em um **relatório oficial** entregue ao poder público, contendo localização precisa, foto, coordenadas GPS e um mapa de calor das áreas mais prejudicadas.

---

## Como usar

**1.** Acesse o site pelo celular e permita o acesso à localização

**2.** Toque no botão **+** no canto inferior direito

**3.** Selecione a categoria do problema, adicione uma descrição (opcional) e tire ou escolha uma foto

**4.** Toque em **"Enviar para análise"** — a ocorrência será revisada antes de aparecer no mapa

---

## Categorias

| | Categoria | Descrição |
|---|---|---|
| 🕳️ | Buraco | Cratera ou buraco na via |
| ⚠️ | Desnível | Irregularidade no piso |
| 💡 | Falta de Iluminação | Poste apagado ou ausente |
| ♿ | Rampa de Acesso | Rampa danificada ou ausente |
| 🚧 | Obstrução | Via ou calçada bloqueada |
| 🌊 | Inundação | Alagamento ou área inundada |

---

## Funcionalidades

- 📍 Localização GPS em tempo real
- 🗺️ Mapa interativo com tema claro (dia) e escuro (noite) automático
- 📷 Foto obrigatória — tirada na hora ou escolhida da galeria
- 📝 Descrição textual opcional (até 200 caracteres)
- 🔄 Atualização automática do mapa a cada 60 segundos
- ✅ Sistema de moderação — ocorrências revisadas antes de publicar
- 📱 PWA — pode ser instalado na tela inicial do celular

---

## Tecnologias

**Frontend**
- HTML, CSS e JavaScript puros — sem frameworks
- [Leaflet.js](https://leafletjs.com/) — mapa interativo
- [CartoDB Basemaps](https://carto.com/basemaps/) — tiles do mapa
- GitHub Pages — hospedagem

**Backend** *(repositório privado)*
- Node.js + Express
- PostgreSQL
- Cloudinary — armazenamento de fotos
- Railway — hospedagem

---

## Instalando como app (PWA)

**Android:** Abra o site no Chrome → menu (⋮) → "Adicionar à tela inicial"

**iPhone:** Abra no Safari → botão de compartilhar → "Adicionar à Tela de Início"

---

## Suporte

✉️ contato.oguiaq@gmail.com
