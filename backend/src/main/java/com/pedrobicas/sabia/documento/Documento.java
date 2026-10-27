package com.pedrobicas.sabia.documento;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "documento")
public class Documento {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Column(nullable = false, length = 255)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoDocumento tipo;

    @Column(name = "tamanho_bytes", nullable = false)
    private long tamanhoBytes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusDocumento status;

    @Column(columnDefinition = "text")
    private String erro;

    @Column(name = "total_trechos", nullable = false)
    private int totalTrechos;

    @Column(name = "enviado_por")
    private UUID enviadoPor;

    @Column(nullable = false)
    private int versao;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    protected Documento() {
    }

    public Documento(UUID empresaId, String nome, TipoDocumento tipo, long tamanhoBytes, UUID enviadoPor) {
        this.empresaId = empresaId;
        this.nome = nome;
        this.tipo = tipo;
        this.tamanhoBytes = tamanhoBytes;
        this.enviadoPor = enviadoPor;
        this.versao = 1;
        this.status = StatusDocumento.ENVIADO;
        this.criadoEm = Instant.now();
        this.atualizadoEm = this.criadoEm;
    }

    /**
     * Um arquivo novo com o mesmo nome chegou: o documento ganha uma versão nova e volta para a fila.
     * Os trechos antigos ficam no índice até o processamento da versão nova substituí-los.
     */
    public void substituirArquivo(TipoDocumento novoTipo, long novoTamanho, UUID quemEnviou) {
        this.tipo = novoTipo;
        this.tamanhoBytes = novoTamanho;
        this.enviadoPor = quemEnviou;
        this.versao++;
        voltarParaFila();
    }

    public void marcarProcessando() {
        this.status = StatusDocumento.PROCESSANDO;
        this.erro = null;
        tocar();
    }

    public void marcarPronto(int totalTrechos) {
        this.status = StatusDocumento.PRONTO;
        this.totalTrechos = totalTrechos;
        this.erro = null;
        tocar();
    }

    public void marcarErro(String mensagem) {
        this.status = StatusDocumento.ERRO;
        this.totalTrechos = 0;
        this.erro = mensagem;
        tocar();
    }

    public void voltarParaFila() {
        this.status = StatusDocumento.ENVIADO;
        this.erro = null;
        tocar();
    }

    private void tocar() {
        this.atualizadoEm = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getEmpresaId() {
        return empresaId;
    }

    public String getNome() {
        return nome;
    }

    public TipoDocumento getTipo() {
        return tipo;
    }

    public long getTamanhoBytes() {
        return tamanhoBytes;
    }

    public StatusDocumento getStatus() {
        return status;
    }

    public String getErro() {
        return erro;
    }

    public int getTotalTrechos() {
        return totalTrechos;
    }

    public UUID getEnviadoPor() {
        return enviadoPor;
    }

    public int getVersao() {
        return versao;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }
}
