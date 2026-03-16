# Realtime Pitch Detection - Guia de Uso

## 🎵 O que é

A funcionalidade **Realtime Pitch Detection** permite detectar notas musicais em tempo real através do microfone, ideal para:

- 🎯 **Prática de canto** - Veja se está cantando as notas corretas
- 📊 **Análise vocal** - Meça seu range vocal e estabilidade
- 🎼 **Treinamento musical** - Desenvolva seu ouvido musical
- 🎤 **Afinação** - Verifique se está afinado corretamente

## 🚀 Como Usar

### 1. Acessar a Funcionalidade

No header principal, clique no botão **"🎵 Pitch Realtime"**:

```html
<button onclick="toggleRealtimePitch()" class="btn btn-sm">
  🎵 Pitch Realtime
</button>
```

### 2. Iniciar Detecção

1. O painel do Realtime Pitch aparecerá
2. Clique em **"Iniciar"** para começar a detecção
3. Permita o acesso ao microfone quando solicitado
4. Comece a cantar ou tocar um instrumento

### 3. Visualizar Resultados

O sistema exibe em tempo real:

- **Nota atual** (C4, D#3, etc.)
- **Frequência** em Hz
- **Cents** (desvio da nota perfeita)
- **Estabilidade** (quão consistente é sua nota)
- **Range vocal** (nota mais baixa e mais alta detectada)
- **Visualização gráf** do pitch ao longo do tempo

## 🎛️ Interface

### Métricas Principais

| Métrica | Descrição |
|---|---|
| **Nota atual** | Nota musical detectada em tempo real |
| **Frequência** | Frequência fundamental em Hz |
| **Cents** | Desvio em cents da nota mais próxima |
| **Estabilidade** | Percentual de consistência das últimas notas |
| **Range vocal** | Extensão vocal detectada |

### Controles

- **🟢 Iniciar** - Começa a detecção de pitch
- **🔴 Parar** - Para a detecção
- **❌ Fechar** - Fecha o painel

### Visualização

O gráfico mostra:
- **Linha azul** - Pitch detectado ao longo do tempo
- **Linha tracejada** - Referência do Dó central (C4)
- **Eixo Y** - Altura das notas (MIDI numbers)
- **Eixo X** - Tempo (últimas 50 amostras)

## 🔧 Funcionalidades Técnicas

### Arquitetura Modular

A funcionalidade está implementada com arquitetura modular:

```
js/services/RealtimePitchService.js    - Lógica de detecção
js/ui/RealtimePitchUI.js             - Interface do usuário
js/app/AppController.js              - Orquestração
```

### Tecnologias Utilizadas

- **Essentia.js** - Análise de áudio e detecção de pitch
- **Web Audio API** - Captura de áudio do microfone
- **Canvas API** - Visualização gráfica em tempo real
- **Script Processor** - Processamento de áudio em tempo real

### Algoritmo de Detecção

O sistema usa o algoritmo **PitchYIN** da Essentia.js:

1. **Captura** - Áudio bruto do microfone
2. **Processamento** - Janelamento e análise
3. **Detecção** - Algoritmo YIN para pitch detection
4. **Filtragem** - Remove frequências fora do range vocal (90-600 Hz)
5. **Conversão** - Transforma frequência em nota musical

## 🎯 Modos de Uso

### 1. Prática Livre

Use para explorar sua voz sem objetivos específicos:
- Veja quais notas consegue cantar confortavelmente
- Experimente diferentes timbres e intensidades
- Observe seu range vocal natural

### 2. Prática Dirigida

Combine com a análise de áudio:
1. **Analise uma música** primeiro
2. **Carregue as notas** no modo de prática
3. **Use o realtime pitch** para cantar junto
4. **Receba feedback** visual sobre precisão

### 3. Treinamento Técnico

Use para melhorar aspectos específicos:
- **Estabilidade** - Mantenha a nota constante
- **Vibrato** - Observe variações de pitch
- **Transições** - Pratique mudanças entre notas

## 📊 Interpretação dos Dados

### Notas e Frequências

- **C4** = ~261.63 Hz (Dó central)
- **A4** = 440 Hz (Padrão de afinação)
- **Range típico**: C2 (65 Hz) a C6 (1047 Hz)

### Cents

- **0 cents** = Nota perfeitamente afinada
- **±50 cents** = Tolerância geralmente aceitável
- **±100 cents** = Meio tom acima/abaixo

### Estabilidade

- **90-100%** = Muito estável (profissional)
- **70-89%** = Bom (amador experiente)
- **50-69%** = Aceitável (iniciante)
- **<50%** = Instável (precisa练习)

## 🎨 Personalização

### Cores e Visual

O sistema usa cores intuitivas:
- **Verde** (#3B6D11) - Confortável/preciso
- **Laranja** (#BA7517) - Médio/aproximado  
- **Vermelho** (#A32D2D) - Difícil/impreciso

### Configurações Avançadas

Você pode modificar parâmetros técnicos:

```javascript
// Em RealtimePitchService.js
const freqRange = { min: 90, max: 600 };  // Range vocal
const maxHistory = 50;                     // Tamanho do histórico
const updateInterval = 100;                // ms entre atualizações
```

## 🔍 Troubleshooting

### Problemas Comuns

**Microfone não funciona:**
- Verifique permissões do navegador
- Use Chrome/Firefox mais recentes
- Teste em https (requer contexto seguro)

**Detecção instável:**
- Cante mais forte e consistente
- Reduza ruído ambiente
- Afaste-se do microfone se estiver muito próximo

**Notas incorretas:**
- Verifique se está cantando a melodia correta
- Use o modo de prática com referência
- Ajuste o volume da sua voz

### Performance

O sistema é otimizado para:
- **Baixa latência** (< 100ms)
- **Uso eficiente de CPU**
- **Buffering adaptativo**
- **Cleanup automático de recursos**

## 🚀 Próximos Passos

### Funcionalidades Futuras

- [ ] **Modo de afinação** - Para instrumentos
- [ ] **Gravação** - Salvar sessões de prática
- [ ] **Metrônomo integrado** - Para prática rítmica
- [ ] **Análise de timbre** - Qualidade vocal
- [ ] **Exercícios guiados** - Lições estruturadas

### Integrações

- **Spotify API** - Praticar com músicas
- **MIDI devices** - Controladores externos
- **DAWs** - Integração com software de produção musical

## 📚 Referências

- [Essentia.js Documentation](https://essentia.upf.edu/documentation/)
- [Web Audio API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Music Theory Fundamentals](https://www.musictheory.net/lessons)

---

**Dica**: Use fones de ouvido com microfone para melhores resultados! 🎧
