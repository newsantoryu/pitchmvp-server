#!/usr/bin/env python3
"""
Teste de memory leak - simula múltiplas transcrições
"""
import requests
import time
import json
import tempfile
import os

API_BASE = "http://localhost:8000"

def test_memory_leak():
    print("🧪 Testando Memory Leak com múltiplas transcrições...")
    
    # Criar arquivo de áudio falso para teste
    test_audio = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
    test_audio.write(b'fake_audio_data_for_testing' * 1000)  # Dados falsos
    test_audio.close()
    
    try:
        # Health check inicial
        print("\n1. Health check inicial:")
        response = requests.get(f"{API_BASE}/pitch/health")
        if response.status_code == 200:
            health = response.json()
            print(f"   Memory inicial: {health['memory_mb']:.1f}MB")
            print(f"   Modelo cacheado: {health['whisper_model_cached']}")
        
        # Simular múltiplos uploads (vão falhar mas testam o modelo)
        print("\n2. Enviando 3 requisições de upload (esperado falhar, mas testa modelo):")
        
        for i in range(3):
            print(f"\n   Requisição {i+1}:")
            
            # Upload de arquivo
            with open(test_audio.name, 'rb') as f:
                files = {'file': f}
                data = {
                    'language': 'en',
                    'voice_gender': 'auto',
                    'title': f'Test Song {i+1}',
                    'artist': f'Test Artist {i+1}'
                }
                
                response = requests.post(f"{API_BASE}/pitch/transcribe-file", files=files, data=data)
                
                if response.status_code == 200:
                    job_data = response.json()
                    job_id = job_data['job_id']
                    print(f"      Job criado: {job_id}")
                    
                    # Verificar status do job
                    time.sleep(2)
                    job_response = requests.get(f"{API_BASE}/pitch/job/{job_id}")
                    if job_response.status_code == 200:
                        job_info = job_response.json()
                        print(f"      Status: {job_info.get('status', 'unknown')}")
                    else:
                        print(f"      Erro ao verificar job: {job_response.status_code}")
                else:
                    print(f"      Erro no upload: {response.status_code}")
            
            # Health check após cada requisição
            health_response = requests.get(f"{API_BASE}/pitch/health")
            if health_response.status_code == 200:
                health = health_response.json()
                print(f"      Memory: {health['memory_mb']:.1f}MB")
                print(f"      Modelo cacheado: {health['whisper_model_cached']}")
            
            time.sleep(1)
        
        # Health check final
        print("\n3. Health check final:")
        response = requests.get(f"{API_BASE}/pitch/health")
        if response.status_code == 200:
            health = response.json()
            print(f"   Memory final: {health['memory_mb']:.1f}MB")
            print(f"   Modelo cacheado: {health['whisper_model_cached']}")
            print(f"   Jobs ativos: {health['active_jobs']}")
        
        print("\n✅ Teste concluído!")
        print("📊 Verifique se:")
        print("   - O modelo foi cacheado após a primeira requisição")
        print("   - A memória não aumentou drasticamente")
        print("   - Não há jobs ativos acumulados")
        
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
    finally:
        # Limpar arquivo temporário
        os.unlink(test_audio.name)

if __name__ == "__main__":
    test_memory_leak()
