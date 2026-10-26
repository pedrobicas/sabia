package com.pedrobicas.sabia.usuario;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.pedrobicas.sabia.auth.UsuarioAtual;
import com.pedrobicas.sabia.usuario.dto.MembroResponse;
import com.pedrobicas.sabia.usuario.dto.NovoMembroRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/usuarios")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Membros da empresa")
public class UsuarioController {

    private final UsuarioService service;

    public UsuarioController(UsuarioService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista os membros da empresa (somente administradores)")
    public List<MembroResponse> listar(UsuarioAtual usuario) {
        return service.listar(usuario);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cria um membro na empresa (somente administradores)")
    public MembroResponse criar(UsuarioAtual usuario, @Valid @RequestBody NovoMembroRequest pedido) {
        return service.criar(usuario, pedido);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove um membro da empresa (somente administradores)")
    public void remover(UsuarioAtual usuario, @PathVariable UUID id) {
        service.remover(usuario, id);
    }
}
