package com.pedrobicas.sabia.demo;

import java.io.IOException;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.pedrobicas.sabia.config.PropriedadesSabia;
import com.pedrobicas.sabia.documento.DocumentoService;
import com.pedrobicas.sabia.empresa.Empresa;
import com.pedrobicas.sabia.empresa.EmpresaRepository;
import com.pedrobicas.sabia.publico.ConfiguracaoPublicaController.ContaDemo;
import com.pedrobicas.sabia.usuario.Papel;
import com.pedrobicas.sabia.usuario.Usuario;
import com.pedrobicas.sabia.usuario.UsuarioRepository;

/**
 * Com DEMO_HABILITADA=true, cria duas empresas fictícias com documentos prontos (em src/main/resources/demo).
 *
 * <p>Cada empresa ganha um usuário "dono dos documentos", com senha aleatória que ninguém conhece: ele só existe
 * para registrar quem enviou os arquivos. Quem visita a demonstração entra por {@link VisitantesDaDemonstracao},
 * com uma conta temporária só dele. A carga acontece uma vez (se o dono já existe, pula).
 */
@Component
public class CargaDeDemonstracao {

    private static final Logger log = LoggerFactory.getLogger(CargaDeDemonstracao.class);

    private static final List<EmpresaDemo> EMPRESAS = List.of(
            new EmpresaDemo("Café Aurora", "demo@cafeaurora.com", "cafe-aurora", List.of(
                    "Posso trocar um produto sem a nota fiscal?",
                    "Quantos dias de férias eu tenho?",
                    "Como funciona o Clube Aurora?",
                    "Vocês fazem entrega?")),
            new EmpresaDemo("Livraria Horizonte", "demo@livrariahorizonte.com", "livraria-horizonte", List.of(
                    "Até quando posso devolver um livro?",
                    "Quando o clube do livro se reúne?")));

    private final PropriedadesSabia propriedades;
    private final EmpresaRepository empresas;
    private final UsuarioRepository usuarios;
    private final PasswordEncoder senhas;
    private final DocumentoService documentos;

    public CargaDeDemonstracao(PropriedadesSabia propriedades, EmpresaRepository empresas, UsuarioRepository usuarios,
            PasswordEncoder senhas, DocumentoService documentos) {
        this.propriedades = propriedades;
        this.empresas = empresas;
        this.usuarios = usuarios;
        this.senhas = senhas;
        this.documentos = documentos;
    }

    /** Roda depois da recuperação da fila de ingestão (ordem 1), para não processar nada duas vezes. */
    @Order(2)
    @EventListener(ApplicationReadyEvent.class)
    public void carregar() {
        if (!propriedades.demo().habilitada()) {
            return;
        }
        for (EmpresaDemo demo : EMPRESAS) {
            if (usuarios.existsByEmail(demo.email())) {
                continue;
            }
            try {
                criar(demo);
            } catch (IOException e) {
                log.error("Não foi possível carregar a empresa de demonstração {}", demo.nome(), e);
            }
        }
    }

    /** Empresas mostradas na tela de entrada quando a demonstração está ligada. */
    public List<ContaDemo> contas() {
        if (!propriedades.demo().habilitada()) {
            return List.of();
        }
        return EMPRESAS.stream().map(demo -> new ContaDemo(demo.nome())).toList();
    }

    /** ID da empresa de demonstração com esse nome, se a demonstração está ligada e a empresa já foi criada. */
    public Optional<UUID> empresaPorNome(String nomeDaEmpresa) {
        if (!propriedades.demo().habilitada() || nomeDaEmpresa == null) {
            return Optional.empty();
        }
        return EMPRESAS.stream()
                .filter(demo -> demo.nome().equals(nomeDaEmpresa.strip()))
                .findFirst()
                .flatMap(demo -> usuarios.findByEmail(demo.email()))
                .map(Usuario::getEmpresaId);
    }

    /**
     * Sugestões fixas de pergunta para uma empresa de demonstração. São sempre estas, e não as perguntas mais
     * feitas, para um visitante não ver na tela inicial o que outro visitante digitou.
     */
    public List<String> sugestoesPara(String nomeDaEmpresa) {
        if (!propriedades.demo().habilitada()) {
            return List.of();
        }
        return EMPRESAS.stream()
                .filter(demo -> demo.nome().equals(nomeDaEmpresa))
                .findFirst()
                .map(EmpresaDemo::sugestoes)
                .orElse(List.of());
    }

    private void criar(EmpresaDemo demo) throws IOException {
        Empresa empresa = empresas.save(new Empresa(demo.nome()));
        Usuario dono = usuarios.save(new Usuario(empresa.getId(), "Documentos da demonstração", demo.email(),
                senhas.encode(UUID.randomUUID().toString()), Papel.MEMBRO));

        Resource[] arquivos = new PathMatchingResourcePatternResolver()
                .getResources("classpath:demo/" + demo.pasta() + "/*");
        Arrays.sort(arquivos, Comparator.comparing(Resource::getFilename));
        for (Resource arquivo : arquivos) {
            documentos.registrar(empresa.getId(), dono.getId(), arquivo.getFilename(), arquivo.getContentAsByteArray());
        }
        log.info("Empresa de demonstração {} criada com {} documento(s)", demo.nome(), arquivos.length);
    }

    private record EmpresaDemo(String nome, String email, String pasta, List<String> sugestoes) {
    }
}
