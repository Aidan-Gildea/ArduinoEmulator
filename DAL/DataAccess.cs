using MySql.Data.MySqlClient;

namespace DAL;


public interface IArduinoEmulatorData
{
    public bool ValidateLogin(string username, string password);

    public void CreateUser(string username, string password);
}   
public class SQLDAL : IArduinoEmulatorData
{
    static string connectionUrl = "";
    MySqlConnection mySqlConnection = new MySqlConnection(connectionString: connectionUrl);

    SQLDAL()
    {
        
    }

    public void CreateUser(string username, string password)
    {
        MySqlCommand command = new MySqlCommand("", mySqlConnection);

        
        throw new NotImplementedException();
    }

    public bool ValidateLogin(string username, string password)
    {
        throw new NotImplementedException();
    }
}
