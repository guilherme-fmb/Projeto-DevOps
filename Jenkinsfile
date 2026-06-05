pipeline {
    agent any

    environment {
        EMAIL_USER = credentials('email-user')
        EMAIL_PASSWORD = credentials('email-password')
        EMAIL_DESTINO = credentials('email-destino')
    }

    stages {

        stage('Instalar Dependências') {
            steps {
                dir('backend') {
                    sh '''
                    pip3 install --break-system-packages -r jenkins_requirements.txt
                    '''
                }
            }
        }

        stage('Executar Testes') {
            steps {
                dir('backend') {
                    sh '''
                    python3 -m pytest -v
                    '''
                }
            }
        }

        stage('Gerar Cobertura') {
            steps {
                dir('backend') {
                    sh '''
                    python3 -m pytest --cov=. \
                    --cov-report=html \
                    --cov-report=xml
                    '''
                }
            }
        }

        stage('Build Docker') {
            steps {
                sh '''
                docker build -t task-manager ./backend
                '''
            }
        }

        stage('Salvar Pacote') {
            steps {
                sh '''
                docker save task-manager -o task-manager.tar
                '''
            }
        }

        stage('Enviar Email') {
            steps {
                dir('backend') {
                    sh '''
                    python3 send_email.py
                    '''
                }
            }
        }
    }

    post {
        always {

            archiveArtifacts artifacts: 'task-manager.tar', allowEmptyArchive: true

            archiveArtifacts artifacts: 'backend/coverage.xml', allowEmptyArchive: true

            archiveArtifacts artifacts: 'backend/htmlcov/**', allowEmptyArchive: true
        }

        success {
            echo 'Pipeline executado com sucesso!'
        }

        failure {
            echo 'Pipeline falhou!'
        }
    }
}