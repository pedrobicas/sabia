package com.pedrobicas.sabia.usuario;

import java.util.List;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pedrobicas.sabia.auth.AuthService;
import com.pedrobicas.sabia.auth.UsuarioAtual;
import com.pedrobicas.sabia.comum.ApiException;
import com.pedrobicas.sabia.usuario.dto.MembroResponse;
import com.pedrobicas.sabia.usuario.dto.NovoMembroRequest;

/**
 * Gestão dos membros de uma empresa. Toda operação é limitada à empresa de quem pede.
 */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder senhas;

    public UsuarioService(UsuarioRepository usuarios, PasswordEncoder senhas) {
        this.usuarios = usuarios;
        this.senhas = senhas;
    }

    @Transactional(readOnly = true)
    public List<MembroResponse> listar(UsuarioAtual atual) {
        return usuarios.findAllByEmpresaIdOrderByNomeAsc(atual.empresaId()).stream()
                .map(MembroResponse::de)
                .toList();
    }

    @Transactional
    public MembroResponse criar(UsuarioAtual atual, NovoMembroRequest pedido) {
        String email = AuthService.normalizarEmail(pedido.email());
        if (usuarios.existsByEmail(email)) {
            throw ApiException.conflito("Já existe uma conta com este e-mail.");
        }
        Usuario novo = new Usuario(atual.empresaId(), pedido.nome().strip(), email,
                senhas.encode(pedido.senha()), pedido.papel());
        return MembroResponse.de(usuarios.save(novo));
    }

    @Transactional
    public void remover(UsuarioAtual atual, UUID id) {
        if (atual.id().equals(id)) {
            throw ApiException.requisicaoInvalida("Você não pode remover a sua própria conta.");
        }
        // Buscar pela empresa de quem pede: o ID de outra empresa simplesmente "não existe" (404).
        Usuario usuario = usuarios.findByIdAndEmpresaId(id, atual.empresaId())
                .orElseThrow(() -> ApiException.naoEncontrado("Membro não encontrado."));
        usuarios.delete(usuario);
    }
}
